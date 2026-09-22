import "server-only";
import { z } from "zod";

import { env } from "@/lib/env";
import { normalizeJob, parseDate, safeHttpUrl } from "@/lib/jobs/normalize";
import type { Salary } from "@/lib/jobs/types";
import { fetchJson, ProviderError } from "@/server/jobs/http";
import { mapEach, type JobProvider } from "@/server/jobs/provider";

/**
 * Adzuna — optional aggregator.
 *   GET https://api.adzuna.com/v1/api/jobs/{country}/search/{page}?app_id&app_key&what&where
 *
 * Off unless ADZUNA_APP_ID and ADZUNA_APP_KEY are set. Adzuna's terms matter
 * here and are reflected in the code and the UI:
 *   - every displayed Adzuna listing carries a "Jobs by Adzuna" attribution;
 *   - commercial use beyond a 14-day trial may need a licence from Adzuna;
 *   - default limits are low (250 requests a day), so each source fetches a
 *     small, fixed number of pages;
 *   - salaries Adzuna *predicts* (salary_is_predicted = 1) are estimates, not
 *     the employer's figure, and are never shown as a salary.
 * Descriptions are excerpts; the full posting is behind `redirect_url`.
 *
 * A source key is "{country}|{what}|{where}", e.g. "sg|frontend developer|".
 */

const COUNTRY_CURRENCY: Record<string, string> = {
  gb: "GBP",
  us: "USD",
  ca: "CAD",
  au: "AUD",
  nz: "NZD",
  sg: "SGD",
  in: "INR",
  za: "ZAR",
  de: "EUR",
  fr: "EUR",
  nl: "EUR",
  it: "EUR",
  es: "EUR",
  at: "EUR",
  be: "EUR",
  pl: "PLN",
  br: "BRL",
  mx: "MXN",
  ch: "CHF",
};

const result = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().min(1),
  description: z.string().nullish(),
  redirect_url: z.string(),
  created: z.string().nullish(),
  company: z.object({ display_name: z.string().nullish() }).nullish(),
  location: z.object({ display_name: z.string().nullish() }).nullish(),
  salary_min: z.number().nullish(),
  salary_max: z.number().nullish(),
  salary_is_predicted: z.union([z.string(), z.number()]).nullish(),
  contract_time: z.string().nullish(),
  contract_type: z.string().nullish(),
  category: z.object({ label: z.string().nullish() }).nullish(),
});

const page = z.object({ results: z.array(z.unknown()) });

/** One page per source per sync keeps usage far inside the default quota. */
const PAGES_PER_SOURCE = 1;
const RESULTS_PER_PAGE = 50;

export function parseAdzunaKey(key: string) {
  const [country = "", what = "", where = ""] = key.split("|");
  return {
    country: country.trim().toLowerCase(),
    what: what.trim(),
    where: where.trim(),
  };
}

export const adzunaProvider: JobProvider = {
  key: "adzuna",
  label: "Adzuna",
  capabilities: {
    SEARCH: true,
    JOB_DETAILS: false, // excerpts only
    EXTERNAL_APPLY: true,
    APPLICATION_FORM: false,
    SUBMIT_APPLICATION: false,
  },
  completeListing: false,
  priority: 1,
  isConfigured: () => Boolean(env.ADZUNA_APP_ID && env.ADZUNA_APP_KEY),

  async fetchJobs(source) {
    if (!adzunaProvider.isConfigured())
      throw new ProviderError("Adzuna is not configured.");
    const { country, what, where } = parseAdzunaKey(source.key);
    if (!/^[a-z]{2}$/.test(country))
      throw new ProviderError(`Invalid Adzuna country "${country}".`);

    const items: unknown[] = [];
    for (let n = 1; n <= PAGES_PER_SOURCE; n++) {
      const params = new URLSearchParams({
        app_id: env.ADZUNA_APP_ID!,
        app_key: env.ADZUNA_APP_KEY!,
        results_per_page: String(RESULTS_PER_PAGE),
        max_days_old: "30",
        "content-type": "application/json",
      });
      if (what) params.set("what", what);
      if (where) params.set("where", where);

      const parsed = page.safeParse(
        await fetchJson(
          `https://api.adzuna.com/v1/api/jobs/${country}/search/${n}?${params}`,
        ),
      );
      if (!parsed.success)
        throw new ProviderError("Unexpected Adzuna response shape.");
      items.push(...parsed.data.results);
      if (parsed.data.results.length < RESULTS_PER_PAGE) break;
    }

    return mapEach(items, result, (item) => {
      const applyUrl = safeHttpUrl(item.redirect_url);
      const company = item.company?.display_name?.trim();
      if (!applyUrl || !company) return null;

      const predicted = String(item.salary_is_predicted ?? "1") !== "0";
      const currency = COUNTRY_CURRENCY[country];
      const salary: Salary | null =
        !predicted &&
        currency &&
        (item.salary_min != null || item.salary_max != null)
          ? {
              min: item.salary_min ?? null,
              max: item.salary_max ?? null,
              currency,
              period: "YEAR",
            }
          : null;

      return normalizeJob("adzuna", {
        externalId: String(item.id),
        title: item.title,
        company,
        department: item.category?.label,
        locations: [item.location?.display_name ?? ""],
        workplace: null,
        employment: [item.contract_time, item.contract_type]
          .filter(Boolean)
          .join(" "),
        salary,
        descriptionText: item.description ?? "",
        descriptionIsExcerpt: true,
        applyUrl,
        sourceUrl: applyUrl,
        postedAt: parseDate(item.created),
      });
    });
  },
};
