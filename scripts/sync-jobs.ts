/**
 * Sync live jobs from every enabled source into the database.
 *
 *   npm run jobs:sync                 all sources
 *   npm run jobs:sync -- greenhouse   one provider
 *
 * The same code the scheduled route runs. Use it to fill a fresh database
 * (after `npm run db:migrate`) and to check sources by hand.
 */
import { syncAllSources } from "@/server/jobs/ingest";
import { db } from "@/server/db";

async function main() {
  const provider = process.argv[2];
  const started = Date.now();
  const { results, skippedSources, staleRetired, expiredRetired } =
    await syncAllSources({ provider });

  for (const r of results) {
    const status = r.error
      ? `FAILED  ${r.error}`
      : `+${r.created} ~${r.updated} =${r.unchanged} -${r.retired}`;
    console.log(
      `${r.source.padEnd(36)} ${status}  (skipped ${r.skipped}, dupes ${r.duplicates}, ${r.ms}ms)`,
    );
  }
  console.log(
    `\n${results.length} sources synced, ${skippedSources} skipped (not configured), ` +
      `${staleRetired} stale and ${expiredRetired} expired retired, ${Date.now() - started}ms`,
  );
  const active = await db.job.count({
    where: { isActive: true, isDemo: false },
  });
  console.log(`${active} live jobs active`);
  await db.$disconnect();
  if (results.some((r) => r.error)) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
