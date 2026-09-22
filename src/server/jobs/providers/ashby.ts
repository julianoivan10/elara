import "server-only";
import { z } from "zod";

import { normalizeJob, parseDate, safeHttpUrl } from "@/lib/jobs/normalize";
import type { Salary } from "@/lib/jobs/types";
import { fetchJson, ProviderError } from "@/server/jobs/http";
import { mapEach, type JobProvider } from "@/server/jobs/provider";

/**
 * Ashby — the public Job Postings API.
 *   GET https://api.ashbyhq.com/posting-api/job-board/{jobBoardName}?includeCompensation=true
 * Public, no key. One call returns every listed job on the board.
 *
 * Application submission exists in Ashby's *authenticated* API, which needs a
 * key issued by each employer — so ELARA sends candidates to `applyUrl`.
 */

const component = z.object({
  compensationType: z.string().nullish(),
  interval: z.string().nullish(),
  currencyCode: z.string().nullish(),
  minValue: z.number().nullish(),
  maxValue: z.number().nullish(),
});

const job = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  department: z.string().nullish(),
  team: z.string().nullish(),
  employmentType: z.string().nullish(),
  location: z.string().nullish(),
  secondaryLocations: z
    .array(z.object({ location: z.string().nullish() }))
    .nullish(),
  publishedAt: z.string().nullish(),
  isListed: z.boolean().nullish(),
  isRemote: z.boolean().nullish(),
  workplaceType: z.string().nullish(),
  jobUrl: z.string().nullish(),
  applyUrl: z.string().nullish(),
  descriptionHtml: z.string().nullish(),
  descriptionPlain: z.string().nullish(),
  shouldDisplayCompensationOnJobPostings: z.boolean().nullish(),
  compensation: z
    .object({ summaryComponents: z.array(component).nullish() })
    .nullish(),
});

const board = z.object({ jobs: z.array(z.unknown()) });

const INTERVAL: Record<string, Salary["period"]> = {
  "1 YEAR": "YEAR",
  "1 MONTH": "MONTH",
  "1 HOUR": "HOUR",
};

function salaryOf(item: z.infer<typeof job>): Salary | null {
  // Respect the employer's choice: compensation marked as not for display is
  // not displayed, even though the API returns it.
  if (!item.shouldDisplayCompensationOnJobPostings) return null;
  const base = item.compensation?.summaryComponents?.find(
    (c) =>
      c.compensationType === "Salary" &&
      c.currencyCode &&
      INTERVAL[c.interval ?? ""],
  );
  if (!base || (base.minValue == null && base.maxValue == null)) return null;
  return {
    min: base.minValue ?? null,
    max: base.maxValue ?? null,
    currency: base.currencyCode!,
    period: INTERVAL[base.interval!],
  };
}

export const ashbyProvider: JobProvider = {
  key: "ashby",
  label: "Ashby",
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
    const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(source.key)}?includeCompensation=true`;
    const parsed = board.safeParse(await fetchJson(url));
    if (!parsed.success)
      throw new ProviderError("Unexpected Ashby response shape.");

    return mapEach(parsed.data.jobs, job, (item) => {
      if (item.isListed === false) return null;
      const applyUrl = safeHttpUrl(item.applyUrl) ?? safeHttpUrl(item.jobUrl);
      if (!applyUrl) return null;

      return normalizeJob("ashby", {
        externalId: item.id,
        title: item.title,
        company: source.name,
        department: item.department ?? item.team,
        locations: [
          item.location ?? "",
          ...(item.secondaryLocations ?? []).map((l) => l.location ?? ""),
        ],
        workplace: item.workplaceType ?? (item.isRemote ? "Remote" : null),
        employment: item.employmentType,
        salary: salaryOf(item),
        descriptionHtml: item.descriptionHtml,
        descriptionText: item.descriptionHtml ? null : item.descriptionPlain,
        applyUrl,
        sourceUrl: safeHttpUrl(item.jobUrl),
        postedAt: parseDate(item.publishedAt),
      });
    });
  },
};
