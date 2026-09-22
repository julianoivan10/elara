import "server-only";
import { z } from "zod";

import { normalizeJob, parseDate, safeHttpUrl } from "@/lib/jobs/normalize";
import { fetchJson, ProviderError } from "@/server/jobs/http";
import { mapEach, type JobProvider } from "@/server/jobs/provider";

/**
 * Greenhouse — the public Job Board API.
 *   GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
 * Public, no key for reading. One call returns every published job.
 *
 * Submitting an application (POST …/jobs/{id}) requires the employer's own Job
 * Board API key, so this provider does discovery, details and the official
 * apply link only.
 */

const job = z.object({
  id: z.union([z.number(), z.string()]),
  title: z.string().min(1),
  company_name: z.string().nullish(),
  absolute_url: z.string().nullish(),
  location: z.object({ name: z.string().nullish() }).nullish(),
  content: z.string().nullish(),
  updated_at: z.string().nullish(),
  first_published: z.string().nullish(),
  application_deadline: z.string().nullish(),
  departments: z.array(z.object({ name: z.string().nullish() })).nullish(),
  offices: z.array(z.object({ name: z.string().nullish() })).nullish(),
  metadata: z
    .array(
      z.object({
        name: z.string().nullish(),
        value: z.unknown(),
      }),
    )
    .nullish(),
});

const board = z.object({ jobs: z.array(z.unknown()) });

/** Some boards publish a "Workplace Type" custom field; use it when present. */
function workplaceOf(item: z.infer<typeof job>): string | null {
  const field = item.metadata?.find((m) =>
    /workplace|work type|remote/i.test(m.name ?? ""),
  );
  const value = Array.isArray(field?.value) ? field?.value[0] : field?.value;
  return typeof value === "string" ? value : null;
}

export const greenhouseProvider: JobProvider = {
  key: "greenhouse",
  label: "Greenhouse",
  capabilities: {
    SEARCH: true,
    JOB_DETAILS: true,
    EXTERNAL_APPLY: true,
    APPLICATION_FORM: false,
    SUBMIT_APPLICATION: false,
  },
  completeListing: true,
  priority: 10,
  isConfigured: () => true,

  async fetchJobs(source) {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(source.key)}/jobs?content=true`;
    const parsed = board.safeParse(await fetchJson(url));
    if (!parsed.success)
      throw new ProviderError("Unexpected Greenhouse response shape.");

    return mapEach(parsed.data.jobs, job, (item) => {
      const applyUrl = safeHttpUrl(item.absolute_url);
      if (!applyUrl) return null;

      return normalizeJob("greenhouse", {
        externalId: String(item.id),
        title: item.title,
        company: item.company_name?.trim() || source.name,
        department: item.departments?.[0]?.name,
        locations: [item.location?.name ?? ""],
        workplace: workplaceOf(item),
        employment: null,
        salary: null,
        descriptionHtml: item.content,
        applyUrl,
        sourceUrl: applyUrl,
        postedAt: parseDate(item.first_published),
        updatedAt: parseDate(item.updated_at),
        expiresAt: parseDate(item.application_deadline),
      });
    });
  },
};
