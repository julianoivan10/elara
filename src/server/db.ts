import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * A single Prisma client per process. Next.js hot-reloads modules in dev, so the
 * instance is parked on globalThis to avoid exhausting database connections.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Errors are not logged here: they are thrown to the caller, which logs a
    // sanitised summary (src/server/log.ts). Prisma's own error log prints
    // validation failures with their query arguments, password hashes included.
    log: process.env.NODE_ENV === "development" ? ["warn"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
