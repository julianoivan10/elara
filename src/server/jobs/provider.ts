import "server-only";
import type { z } from "zod";

import type {
  NormalizedJob,
  ProviderCapabilities,
  ProviderKey,
} from "@/lib/jobs/types";

/**
 * The contract every job provider implements. The ingestion layer and the UI
 * only ever talk to this — never to Ashby, Greenhouse, Lever or Adzuna
 * directly — so adding SEEK or any other source later is one new file.
 */

export type SourceRef = {
  /** Board token, Lever site, or "country|query" for an aggregator. */
  key: string;
  /** Company name (ATS boards) or label (aggregator searches). */
  name: string;
};

/** What a native submission would carry. Used only by a real ATS integration. */
export type SubmissionInput = {
  externalJobId: string;
  candidate: { name: string; email: string; phone?: string | null };
  resumePdf: Uint8Array;
  coverLetter?: string | null;
  answers: { question: string; answer: string }[];
};

/** A submission is only ever reported after the provider's API confirms it. */
export type SubmissionResult = { confirmationId: string };

export type FetchResult = {
  jobs: NormalizedJob[];
  /** Items the provider returned that failed validation or mapping. */
  skipped: number;
};

export interface JobProvider {
  key: ProviderKey;
  label: string;
  capabilities: ProviderCapabilities;
  /**
   * Whether one fetch returns *every* open job for the source. True for ATS
   * boards: a job missing from a successful fetch has been closed. False for
   * aggregator searches, where absence proves nothing.
   */
  completeListing: boolean;
  /**
   * Dedupe priority: when the same job arrives from two providers, the higher
   * one wins. Direct company boards outrank aggregators.
   */
  priority: number;
  /** Credentials present (always true for the public ATS board APIs). */
  isConfigured(): boolean;
  fetchJobs(source: SourceRef): Promise<FetchResult>;
  /**
   * Native application submission through the provider's official API.
   * Implemented only where the provider supports it AND the employer has
   * granted ELARA credentials; declared together with
   * capabilities.SUBMIT_APPLICATION. No provider implements it today.
   */
  submitApplication?(
    source: SourceRef,
    input: SubmissionInput,
  ): Promise<SubmissionResult>;
}

/** Validate each item on its own: one malformed posting never sinks a board. */
export function mapEach<S extends z.ZodTypeAny>(
  items: unknown[],
  schema: S,
  map: (item: z.infer<S>) => NormalizedJob | null,
): FetchResult {
  const jobs: NormalizedJob[] = [];
  let skipped = 0;
  for (const item of items) {
    const parsed = schema.safeParse(item);
    if (!parsed.success) {
      skipped += 1;
      continue;
    }
    try {
      const job = map(parsed.data);
      if (job) jobs.push(job);
      else skipped += 1;
    } catch {
      skipped += 1;
    }
  }
  return { jobs, skipped };
}
