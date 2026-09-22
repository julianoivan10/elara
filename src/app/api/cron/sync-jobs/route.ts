import { timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";
import { syncAllSources } from "@/server/jobs/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** The most every Vercel plan allows; sources sync four at a time. */
export const maxDuration = 60;

/**
 * Scheduled job sync (see "crons" in vercel.json).
 *
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. Without a
 * configured secret the route refuses to run at all — it is never public.
 */
export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return Response.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const summary = await syncAllSources();
  const failed = summary.results.filter((r) => r.error);

  return Response.json(
    {
      ok: failed.length === 0,
      sources: summary.results.length,
      failed: failed.map((r) => ({ source: r.source, error: r.error })),
      created: summary.results.reduce((n, r) => n + r.created, 0),
      updated: summary.results.reduce((n, r) => n + r.updated, 0),
      retired:
        summary.results.reduce((n, r) => n + r.retired, 0) +
        summary.staleRetired +
        summary.expiredRetired,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
