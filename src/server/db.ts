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
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
