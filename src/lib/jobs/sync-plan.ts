import type { NormalizedJob } from "@/lib/jobs/types";

/**
 * What one sync of one source should change, computed without touching the
 * database. The executor (src/server/jobs/ingest.ts) then applies it in a
 * handful of batched queries.
 *
 * Freshness policy:
 *   - new listing                 → create
 *   - content changed             → update
 *   - unchanged                   → touch lastSeenAt (and reactivate if it
 *                                   had been retired as "removed" or "stale")
 *   - gone from a *complete* feed → retire as "removed" (never deleted: saved
 *                                   jobs and applications keep pointing at it)
 *   - gone from a partial feed    → nothing; aggregator results are a sample,
 *                                   so absence proves nothing
 *   - past its closing date       → stored, but inactive as "expired"
 */

export type ExistingJob = {
  id: string;
  externalId: string | null;
  contentHash: string | null;
  isActive: boolean;
  inactiveReason: string | null;
};

export type SyncPlan = {
  create: NormalizedJob[];
  update: { id: string; job: NormalizedJob }[];
  /** Seen and unchanged: bump lastSeenAt, make active. */
  touch: string[];
  /** Existing and active, missing from a complete feed. */
  retire: string[];
  /** Incoming jobs whose closing date has passed (by externalId). */
  expired: Set<string>;
  /** Incoming items dropped as duplicates within this feed. */
  duplicatesInFeed: number;
};

/** Retirement reasons a fresh sighting may undo. "duplicate" is not one. */
const REVIVABLE = new Set(["removed", "stale", "expired"]);

export function planSync({
  incoming,
  existing,
  completeListing,
  now = new Date(),
}: {
  incoming: NormalizedJob[];
  existing: ExistingJob[];
  completeListing: boolean;
  now?: Date;
}): SyncPlan {
  const byExternal = new Map(
    existing.filter((e) => e.externalId).map((e) => [e.externalId!, e]),
  );

  const seen = new Set<string>();
  const plan: SyncPlan = {
    create: [],
    update: [],
    touch: [],
    retire: [],
    expired: new Set(),
    duplicatesInFeed: 0,
  };

  for (const job of incoming) {
    if (seen.has(job.externalId)) {
      plan.duplicatesInFeed += 1;
      continue;
    }
    seen.add(job.externalId);

    if (job.expiresAt && job.expiresAt.getTime() < now.getTime()) {
      plan.expired.add(job.externalId);
    }

    const current = byExternal.get(job.externalId);
    if (!current) {
      plan.create.push(job);
    } else if (
      current.contentHash !== job.contentHash ||
      plan.expired.has(job.externalId)
    ) {
      plan.update.push({ id: current.id, job });
    } else if (
      current.isActive ||
      REVIVABLE.has(current.inactiveReason ?? "")
    ) {
      plan.touch.push(current.id);
    }
    // An unchanged listing retired as a cross-provider duplicate stays retired.
  }

  if (completeListing) {
    for (const current of existing) {
      if (
        current.isActive &&
        current.externalId &&
        !seen.has(current.externalId)
      ) {
        plan.retire.push(current.id);
      }
    }
  }

  return plan;
}
