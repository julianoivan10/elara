import "server-only";
import { Prisma } from "@prisma/client";

/**
 * Structured, secret-free error logging for server code.
 *
 * Errors are reduced to a fixed set of fields before they are written, rather
 * than logged whole. A raw Prisma validation error, for example, prints the
 * query arguments it was given — which on the auth paths means an email and a
 * password hash. Nothing here ever reads a request body, a cookie or an
 * environment value, so none of those can reach the log.
 *
 * Each entry is one JSON line, which Vercel's log view renders and searches well.
 */

type ErrorSummary = {
  name: string;
  /** Prisma error code (P1001, P2021, …) when there is one. */
  code?: string;
  message: string;
  /** Prisma's structured metadata — model and field names, never values. */
  meta?: Record<string, unknown>;
  /** What this failure usually means in deployment, when we can tell. */
  hint?: string;
};

const MAX_MESSAGE = 400;

/**
 * The failures that differ between a laptop and a serverless host, keyed by
 * Prisma error code, each with the fix that has actually applied here.
 */
const HINTS: Record<string, string> = {
  P1001:
    "Database unreachable. On Vercel, DATABASE_URL must be the Supabase pooler (IPv4) connection string, not the direct db.<ref>.supabase.co host, which is IPv6-only.",
  P1002: "Database connection timed out. Check DATABASE_URL host and port.",
  P1000: "Database rejected the credentials in DATABASE_URL.",
  P1003: "The database named in DATABASE_URL does not exist.",
  P1017: "The database closed the connection.",
  P2021:
    "A table is missing. The database has not been migrated: run `prisma migrate deploy` against it.",
  P2022:
    "A column is missing. The database is behind the schema: run `prisma migrate deploy` against it.",
  P2024:
    "Timed out waiting for a pooled connection. Raise connection_limit in DATABASE_URL (5 suits Vercel with the Supabase pooler).",
};

export function summarizeError(error: unknown): ErrorSummary {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return {
      name: error.name,
      code: error.code,
      message: lastLine(error.message),
      meta: error.meta,
      hint: HINTS[error.code],
    };
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    const code = error.errorCode;
    return {
      name: error.name,
      code,
      message: lastLine(error.message),
      hint: code ? HINTS[code] : undefined,
    };
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    // The full message echoes the query arguments. Keep only the verdict line.
    return { name: error.name, message: lastLine(error.message) };
  }

  if (error instanceof Error) {
    const message = lastLine(error.message);
    return {
      name: error.name,
      message,
      hint: /prepared statement/i.test(message)
        ? "Transaction pooler without pgbouncer mode. Add ?pgbouncer=true to DATABASE_URL."
        : undefined,
    };
  }

  return { name: typeof error, message: "Non-error value thrown." };
}

/** Log one failure as a single JSON line. `context` names the operation. */
export function logError(
  context: string,
  error: unknown,
  extra?: Record<string, string | number | boolean | undefined>,
) {
  console.error(
    JSON.stringify({
      level: "error",
      context,
      ...extra,
      error: summarizeError(error),
    }),
  );
}

function lastLine(message: string) {
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return (lines.at(-1) ?? "").slice(0, MAX_MESSAGE);
}
