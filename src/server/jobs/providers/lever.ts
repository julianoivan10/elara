import "server-only";
import { z } from "zod";

import { normalizeJob, parseDate, safeHttpUrl } from "@/lib/jobs/normalize";
import type { Salary } from "@/lib/jobs/types";
import { fetchJson, ProviderError } from "@/server/jobs/http";
import { mapEach, type JobProvider } from "@/server/jobs/provider";

/**
 * Lever — the public Postings API.
 *   GET https://api.lever.co/v0/postings/{site}?mode=json
 * Public, no key. Returns every published posting for the site. (Postings on
 * Lever's EU instance live at api.eu.lever.co; a source key of "eu:{site}"
 * selects it.)
 *
 * Applying through the API (POST …/postings/{site}/{id}) needs an API key the
 * employer issues, so this provider sends candidates to `applyUrl`.
 */

const posting = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  categories: z
    .object({
      commitment: z.string().nullish(),
      department: z.string().nullish(),
      team: z.string().nullish(),
      location: z.string().nullish(),
      allLocations: z.array(z.string()).nullish(),
    })
    .nullish(),
  description: z.string().nullish(),
  descriptionPlain: z.string().nullish(),
  lists: z.array(z.object({ text: z.string(), content: z.string() })).nullish(),
  additional: z.string().nullish(),
  hostedUrl: z.string().nullish(),
  applyUrl: z.string().nullish(),
  createdAt: z.number().nullish(),
  workplaceType: z.string().nullish(),
  salaryRange: z
    .object({
      min: z.number().nullish(),
      max: z.number().nullish(),
      currency: z.string().nullish(),
      interval: z.string().nullish(),
    })
    .nullish(),
});

function salaryOf(item: z.infer<typeof posting>): Salary | null {
  const range = item.salaryRange;
  if (!range?.currency || (range.min == null && range.max == null)) return null;
  const interval = (range.interval ?? "").toLowerCase();
  const period: Salary["period"] | null = interval.includes("year")
    ? "YEAR"
    : interval.includes("month")
      ? "MONTH"
      : interval.includes("hour")
        ? "HOUR"
        : null;
  if (!period) return null;
  return {
    min: range.min ?? null,
    max: range.max ?? null,
    currency: range.currency,
    period,
  };
}

export const leverProvider: JobProvider = {
  key: "lever",
  label: "Lever",
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
    const [host, site] = source.key.startsWith("eu:")
      ? ["https://api.eu.lever.co", source.key.slice(3)]
      : ["https://api.lever.co", source.key];
    const data = await fetchJson(
      `${host}/v0/postings/${encodeURIComponent(site)}?mode=json`,
    );
    if (!Array.isArray(data))
      throw new ProviderError("Unexpected Lever response shape.");

    return mapEach(data, posting, (item) => {
      const applyUrl =
        safeHttpUrl(item.applyUrl) ?? safeHttpUrl(item.hostedUrl);
      if (!applyUrl) return null;
      const categories = item.categories ?? {};

      return normalizeJob("lever", {
        externalId: item.id,
        title: item.text,
        company: source.name,
        department: categories.department ?? categories.team,
        locations: [
          categories.location ?? "",
          ...(categories.allLocations ?? []),
        ],
        // "unspecified" is Lever's "we did not say" — keep it unknown.
        workplace:
          item.workplaceType === "unspecified" ? null : item.workplaceType,
        employment: categories.commitment,
        salary: salaryOf(item),
        descriptionHtml: item.description,
        descriptionText: item.description ? null : item.descriptionPlain,
        sections: (item.lists ?? []).map((list) => ({
          heading: list.text,
          html: list.content,
        })),
        closingHtml: item.additional,
        applyUrl,
        sourceUrl: safeHttpUrl(item.hostedUrl),
        postedAt: parseDate(item.createdAt),
      });
    });
  },
};
