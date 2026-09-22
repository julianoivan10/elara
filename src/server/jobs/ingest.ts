import "server-only";
import type { Prisma } from "@prisma/client";

import { refineWithBoilerplate } from "@/lib/jobs/boilerplate";
import { STALE_AFTER_DAYS, staleCutoff } from "@/lib/jobs/freshness";
import { planSync } from "@/lib/jobs/sync-plan";
import type { NormalizedJob } from "@/lib/jobs/types";
import { db } from "@/server/db";
import { logError } from "@/server/log";
import { getProvider, PROVIDERS } from "@/server/jobs/providers";
import { ensureDefaultSources } from "@/server/jobs/sources";

/**
 * Ingestion: provider → normalise → validate → dedupe → persist → freshness.
 *
 * Pages never call a provider. They read the Job table, which this keeps
 * current; a scheduled route (app/api/cron/sync-jobs) and `npm run jobs:sync`
 * are the only callers. One source failing is recorded on that source and
 * leaves every other source, and its own previously synced jobs, untouched.
 */

export { STALE_AFTER_DAYS };

export type SourceSyncResult = {
  source: string;
  created: number;
  updated: number;
  unchanged: number;
  retired: number;
  skipped: number;
  duplicates: number;
  error?: string;
  ms: number;
};

const CHUNK = 100;

function toRow(
  job: NormalizedJob,
  sourceId: string,
  now: Date,
  active: boolean,
) {
  return {
    source: job.provider,
    externalId: job.externalId,
    sourceId,
    title: job.title,
    company: job.company,
    department: job.department,
    location: job.location,
    locations: job.locations,
    locationSearch: job.locationSearch,
    locationType: job.locationType,
    employmentType: job.employmentType,
    seniority: job.seniority,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    salaryPeriod: job.salaryPeriod,
    salaryAnnualMin: job.salaryAnnualMin,
    salaryAnnualMax: job.salaryAnnualMax,
    summary: job.summary,
    description: job.description,
    descriptionIsExcerpt: job.descriptionIsExcerpt,
    requirements: job.requirements,
    responsibilities: job.responsibilities,
    benefits: job.benefits,
    skills: job.skills,
    applyUrl: job.applyUrl,
    sourceUrl: job.sourceUrl,
    postedAt: job.postedAt,
    expiresAt: job.expiresAt,
    providerUpdatedAt: job.providerUpdatedAt,
    fingerprint: job.fingerprint,
    contentHash: job.contentHash,
    isDemo: false,
    isActive: active,
    inactiveReason: active ? null : "expired",
    lastSeenAt: now,
  } satisfies Prisma.JobUncheckedCreateInput;
}

async function inChunks<T>(
  items: T[],
  size: number,
  run: (chunk: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < items.length; i += size)
    await run(items.slice(i, i + size));
}

/** Run async work with bounded concurrency. */
async function pool<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>,
) {
  const out: R[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await run(items[i]);
      }
    }),
  );
  return out;
}

export async function syncSource(source: {
  id: string;
  provider: string;
  key: string;
  name: string;
}): Promise<SourceSyncResult> {
  const started = Date.now();
  const label = `${source.provider}:${source.key}`;
  const result: SourceSyncResult = {
    source: label,
    created: 0,
    updated: 0,
    unchanged: 0,
    retired: 0,
    skipped: 0,
    duplicates: 0,
    ms: 0,
  };
  const provider = getProvider(source.provider);

  try {
    if (!provider) throw new Error(`Unknown provider "${source.provider}".`);
    if (!provider.isConfigured())
      throw new Error(`${provider.label} is not configured.`);

    const fetched = await provider.fetchJobs({
      key: source.key,
      name: source.name,
    });
    result.skipped = fetched.skipped;
    // Skills and summaries come from each posting's own text, not from the
    // company boilerplate repeated across the whole board.
    let incoming = refineWithBoilerplate(fetched.jobs);

    // An aggregator copy of a job that a company board already lists is
    // dropped: the company's own posting is the better record.
    if (provider.priority < 10 && incoming.length) {
      const direct = await db.job.findMany({
        where: {
          fingerprint: { in: incoming.map((j) => j.fingerprint) },
          isActive: true,
          source: {
            in: Object.values(PROVIDERS)
              .filter((p) => p.priority > provider.priority)
              .map((p) => p.key),
          },
        },
        select: { fingerprint: true },
      });
      const taken = new Set(direct.map((d) => d.fingerprint));
      const before = incoming.length;
      incoming = incoming.filter((j) => !taken.has(j.fingerprint));
      result.duplicates += before - incoming.length;
    }

    const existing = await db.job.findMany({
      where: {
        OR: [
          { sourceId: source.id },
          {
            source: provider.key,
            externalId: { in: incoming.map((j) => j.externalId) },
          },
        ],
      },
      select: {
        id: true,
        externalId: true,
        contentHash: true,
        isActive: true,
        inactiveReason: true,
      },
    });

    const now = new Date();
    const plan = planSync({
      incoming,
      existing,
      completeListing: provider.completeListing,
      now,
    });
    result.duplicates += plan.duplicatesInFeed;

    await inChunks(plan.create, CHUNK, (chunk) =>
      db.job.createMany({
        data: chunk.map((job) =>
          toRow(job, source.id, now, !plan.expired.has(job.externalId)),
        ),
        skipDuplicates: true,
      }),
    );
    await pool(plan.update, 5, ({ id, job }) =>
      db.job.update({
        where: { id },
        data: toRow(job, source.id, now, !plan.expired.has(job.externalId)),
      }),
    );
    await inChunks(plan.touch, 500, (ids) =>
      db.job.updateMany({
        where: { id: { in: ids } },
        data: {
          lastSeenAt: now,
          isActive: true,
          inactiveReason: null,
          sourceId: source.id,
        },
      }),
    );
    await inChunks(plan.retire, 500, (ids) =>
      db.job.updateMany({
        where: { id: { in: ids } },
        data: { isActive: false, inactiveReason: "removed" },
      }),
    );

    // A company board outranks aggregators: retire aggregator copies of the
    // jobs it just confirmed.
    if (provider.priority >= 10 && incoming.length) {
      const lower = Object.values(PROVIDERS)
        .filter((p) => p.priority < provider.priority)
        .map((p) => p.key);
      await inChunks(
        incoming.map((j) => j.fingerprint),
        500,
        (fingerprints) =>
          db.job.updateMany({
            where: {
              fingerprint: { in: fingerprints },
              source: { in: lower },
              isActive: true,
            },
            data: { isActive: false, inactiveReason: "duplicate" },
          }),
      );
    }

    result.created = plan.create.length;
    result.updated = plan.update.length;
    result.unchanged = plan.touch.length;
    result.retired = plan.retire.length;

    await db.jobSource.update({
      where: { id: source.id },
      data: {
        lastSyncedAt: now,
        lastSuccessAt: now,
        lastError: null,
        lastJobCount: incoming.length,
      },
    });
  } catch (error) {
    // The message is safe to store: provider errors carry status codes and
    // reasons, never credentials (Adzuna's key is in a query string that no
    // error message includes).
    result.error =
      error instanceof Error ? error.message.slice(0, 300) : "Unknown error";
    logError("jobSync", error, { source: label });
    await db.jobSource
      .update({
        where: { id: source.id },
        data: { lastSyncedAt: new Date(), lastError: result.error },
      })
      .catch(() => undefined);
  }

  result.ms = Date.now() - started;
  return result;
}

/** Sync every enabled source, a few at a time, then sweep stale listings. */
export async function syncAllSources({ provider }: { provider?: string } = {}) {
  await ensureDefaultSources();
  const sources = await db.jobSource.findMany({
    where: { enabled: true, ...(provider ? { provider } : {}) },
    select: { id: true, provider: true, key: true, name: true },
    orderBy: { lastSyncedAt: { sort: "asc", nulls: "first" } },
  });

  // Unconfigured optional providers (Adzuna without keys) are skipped quietly
  // rather than recorded as failures every run.
  const runnable = sources.filter((s) =>
    getProvider(s.provider)?.isConfigured(),
  );
  const results = await pool(runnable, 4, syncSource);
  const swept = await sweepFreshness();

  return {
    results,
    skippedSources: sources.length - runnable.length,
    ...swept,
  };
}

/** Retire what nobody has seen in a while, and anything past its closing date. */
export async function sweepFreshness(now = new Date()) {
  const staleBefore = staleCutoff(now);
  const [stale, expired] = await Promise.all([
    db.job.updateMany({
      where: { isActive: true, isDemo: false, lastSeenAt: { lt: staleBefore } },
      data: { isActive: false, inactiveReason: "stale" },
    }),
    db.job.updateMany({
      where: { isActive: true, isDemo: false, expiresAt: { lt: now } },
      data: { isActive: false, inactiveReason: "expired" },
    }),
  ]);
  return { staleRetired: stale.count, expiredRetired: expired.count };
}
