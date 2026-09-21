import { db } from "@/server/db";
import { logError } from "@/server/log";

/** Prisma needs the Node runtime. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deployment health: can this instance reach the database, and has the schema
 * been migrated? Reading from "User" answers both, since the auth tables are
 * the first thing every request needs.
 *
 * The response says only ok / not ok. The cause goes to the server log, where
 * logError reduces it to a code and a hint (see src/server/log.ts).
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1 FROM "User" LIMIT 1`;
    return Response.json(
      { status: "ok", database: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError("health", error);
    return Response.json(
      { status: "error", database: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
