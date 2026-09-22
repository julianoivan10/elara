import "server-only";

import type { ApplicationMethod } from "@prisma/client";

import { isProviderKey, PROVIDER_LABEL } from "@/lib/jobs/types";
import { getProvider } from "@/server/jobs/providers";

/**
 * How an application for a job can be made — the single place that decides.
 *
 *   EXTERNAL_LINK  the person applies on the official page (every provider
 *                  today). ELARA prepares, the person submits.
 *   ATS            ELARA submits through the provider's official API. Only
 *                  when the provider declares SUBMIT_APPLICATION *and*
 *                  implements `submitApplication` with credentials the
 *                  employer granted. No provider does yet, so this branch is
 *                  never taken — and ELARA never simulates a submission.
 */
export type ApplicationChannel = {
  method: Extract<ApplicationMethod, "EXTERNAL_LINK" | "ATS">;
  provider: string;
  providerLabel: string;
  applyUrl: string;
  /** Button text that says exactly where the person is going. */
  applyLabel: string;
  canSubmitInElara: boolean;
};

export function applicationChannelFor(job: {
  source: string;
  applyUrl: string;
}): ApplicationChannel {
  const provider = getProvider(job.source);
  const providerLabel = isProviderKey(job.source)
    ? PROVIDER_LABEL[job.source]
    : job.source;
  const native = Boolean(
    provider?.capabilities.SUBMIT_APPLICATION && provider.submitApplication,
  );

  return {
    method: native ? "ATS" : "EXTERNAL_LINK",
    provider: job.source,
    providerLabel,
    applyUrl: job.applyUrl,
    // Aggregator links go to a job site, not the employer's own page.
    applyLabel:
      provider?.priority === 1
        ? "Apply on the job site"
        : "Apply on the company site",
    canSubmitInElara: native,
  };
}
