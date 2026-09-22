import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import { staleCutoff } from "@/lib/jobs/freshness";
import { canonicalSkill } from "@/lib/jobs/skills";
import { PROVIDER_KEYS } from "@/lib/jobs/types";

/**
 * JobService: live job discovery, filtering and saving.
 *
 * Reads only. Listings are written by the ingestion layer (src/server/jobs);
 * nothing here ever calls a provider. Every query goes through `liveJobWhere`,
 * so a demo row, a retired listing, or one no sync has confirmed recently can
 * never appear as live.
 *
 * Filters come from the URL — shareable, bookmarkable, back-button friendly —
 * and are validated here because they reach a database query.
 */

const optionalEnum = <const T extends readonly [string, ...string[]]>(
  values: T,
) => z.enum(values).optional().catch(undefined);

export const jobFiltersSchema = z.object({
  q: z.string().trim().max(120).optional().catch(undefined),
  location: z.string().trim().max(120).optional().catch(undefined),
  // "remote=true" is accepted as shorthand for remote-only.
  remote: z
    .preprocess(
      (v) => (v === "true" ? "REMOTE" : v),
      z.enum(["ONSITE", "HYBRID", "REMOTE"]),
    )
    .optional()
    .catch(undefined),
  type: optionalEnum([
    "FULL_TIME",
    "PART_TIME",
    "CONTRACT",
    "INTERNSHIP",
    "FREELANCE",
    "VOLUNTEER",
  ]),
  seniority: optionalEnum(["INTERNSHIP", "ENTRY", "MID", "SENIOR", "LEAD"]),
  skill: z.string().trim().max(60).optional().catch(undefined),
  source: optionalEnum([...PROVIDER_KEYS]),
  posted: optionalEnum(["1", "7", "30"]),
  salary: optionalEnum(["disclosed"]),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/)
    .transform((v) => v.toUpperCase())
    .optional()
    .catch(undefined),
  minSalary: z.coerce
    .number()
    .int()
    .min(0)
    .max(100_000_000)
    .optional()
    .catch(undefined),
  sort: z.enum(["recent", "salary"]).default("recent").catch("recent"),
  page: z.coerce.number().int().min(1).max(500).default(1).catch(1),
});

export type JobFilters = z.infer<typeof jobFiltersSchema>;

export const JOBS_PER_PAGE = 20;

/** The only definition of "a job we may show as open right now". */
export function liveJobWhere(now = new Date()): Prisma.JobWhereInput {
  return {
    isDemo: false,
    isActive: true,
    lastSeenAt: { gte: staleCutoff(now) },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

export function hasActiveFilters(filters: JobFilters) {
  return Boolean(
    filters.q ||
    filters.location ||
    filters.remote ||
    filters.type ||
    filters.seniority ||
    filters.skill ||
    filters.source ||
    filters.posted ||
    filters.salary ||
    filters.minSalary ||
    filters.currency,
  );
}

export function buildJobWhere(
  filters: JobFilters,
  now = new Date(),
): Prisma.JobWhereInput {
  const and: Prisma.JobWhereInput[] = [liveJobWhere(now)];

  if (filters.q) {
    const q = filters.q;
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        { skills: { has: canonicalSkill(q) } },
      ],
    });
  }

  if (filters.location) {
    and.push({ locationSearch: { contains: filters.location.toLowerCase() } });
  }
  if (filters.remote) and.push({ locationType: filters.remote });
  if (filters.type) and.push({ employmentType: filters.type });
  if (filters.seniority) and.push({ seniority: filters.seniority });
  if (filters.skill)
    and.push({ skills: { has: canonicalSkill(filters.skill) } });
  if (filters.source) and.push({ source: filters.source });
  if (filters.posted) {
    and.push({
      postedAt: {
        gte: new Date(now.getTime() - Number(filters.posted) * 86_400_000),
      },
    });
  }

  // Salary comparisons only make sense within one currency, so a minimum
  // applies to jobs paying in the chosen currency, compared as yearly pay.
  if (filters.salary === "disclosed" || filters.minSalary) {
    and.push({ salaryAnnualMax: { not: null } });
  }
  if (filters.currency) and.push({ salaryCurrency: filters.currency });
  if (filters.minSalary) {
    and.push({ salaryAnnualMax: { gte: filters.minSalary } });
  }

  return { AND: and };
}

/** What a job card needs, and nothing more (no descriptions). */
export const JOB_CARD_SELECT = {
  id: true,
  title: true,
  company: true,
  companyLogoUrl: true,
  location: true,
  locations: true,
  locationType: true,
  employmentType: true,
  seniority: true,
  salaryMin: true,
  salaryMax: true,
  salaryCurrency: true,
  salaryPeriod: true,
  salaryAnnualMax: true,
  summary: true,
  skills: true,
  postedAt: true,
  firstSeenAt: true,
  source: true,
  applyUrl: true,
  isActive: true,
  isDemo: true,
  lastSeenAt: true,
  expiresAt: true,
} satisfies Prisma.JobSelect;

export type JobCardData = Prisma.JobGetPayload<{
  select: typeof JOB_CARD_SELECT;
}>;

/** Live now, by the same rule as liveJobWhere — for rows fetched another way. */
export function isLive(
  job: Pick<JobCardData, "isActive" | "isDemo" | "lastSeenAt" | "expiresAt">,
  now = new Date(),
) {
  return (
    job.isActive &&
    !job.isDemo &&
    job.lastSeenAt >= staleCutoff(now) &&
    (!job.expiresAt || job.expiresAt > now)
  );
}

export const JobService = {
  async search(filters: JobFilters, userId?: string) {
    const where = buildJobWhere(filters);
    const skip = (filters.page - 1) * JOBS_PER_PAGE;
    // Salary order is only meaningful inside one currency.
    const bySalary = filters.sort === "salary" && Boolean(filters.currency);

    const [jobs, total, savedIds] = await Promise.all([
      db.job.findMany({
        where,
        select: JOB_CARD_SELECT,
        orderBy: bySalary
          ? [
              { salaryAnnualMax: { sort: "desc", nulls: "last" } },
              { postedAt: { sort: "desc", nulls: "last" } },
            ]
          : [
              { postedAt: { sort: "desc", nulls: "last" } },
              { firstSeenAt: "desc" },
            ],
        skip,
        take: JOBS_PER_PAGE,
      }),
      db.job.count({ where }),
      userId ? savedJobIds(userId) : Promise.resolve(new Set<string>()),
    ]);

    return {
      jobs: jobs.map((job) => ({ ...job, saved: savedIds.has(job.id) })),
      total,
      page: filters.page,
      pages: Math.max(1, Math.ceil(total / JOBS_PER_PAGE)),
    };
  },

  /** Counts for the filter rail, computed over live jobs only. */
  async facets() {
    const cutoff = staleCutoff();
    const live = liveJobWhere();
    const [skills, sources, currencies] = await Promise.all([
      db.$queryRaw<{ name: string; count: number }[]>`
        SELECT s AS name, count(*)::int AS count
        FROM "Job", unnest("skills") AS s
        WHERE "isDemo" = false AND "isActive" = true AND "lastSeenAt" >= ${cutoff}
          AND ("expiresAt" IS NULL OR "expiresAt" > now())
        GROUP BY s ORDER BY count DESC, s ASC LIMIT 16`,
      db.job.groupBy({ by: ["source"], where: live, _count: { _all: true } }),
      db.job.groupBy({
        by: ["salaryCurrency"],
        where: { AND: [live, { salaryCurrency: { not: null } }] },
        _count: { _all: true },
        orderBy: { _count: { salaryCurrency: "desc" } },
      }),
    ]);
    // Every live job has exactly one source, so the total is their sum — one
    // query fewer than counting again.
    const liveTotal = sources.reduce((sum, s) => sum + s._count._all, 0);

    return {
      skills,
      sources: sources.map((s) => ({ source: s.source, count: s._count._all })),
      currencies: currencies
        .filter((c) => c.salaryCurrency)
        .map((c) => ({ currency: c.salaryCurrency!, count: c._count._all })),
      liveTotal,
    };
  },

  /** One job, live or not (a saved or tracked job may since have closed). */
  async get(jobId: string, userId?: string) {
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: { jobSource: { select: { name: true, provider: true } } },
    });
    if (!job || job.isDemo) return null;

    const [saved, application] = userId
      ? await Promise.all([
          db.savedJob.findUnique({
            where: { userId_jobId: { userId, jobId } },
            select: { id: true },
          }),
          db.application.findFirst({
            where: { userId, jobId },
            select: {
              id: true,
              status: true,
              method: true,
              resumeId: true,
              preparedAt: true,
            },
          }),
        ])
      : [null, null];

    return { ...job, saved: Boolean(saved), application, live: isLive(job) };
  },

  /** Toggle rather than separate save/unsave: one button, one action. */
  async toggleSaved(userId: string, jobId: string) {
    const existing = await db.savedJob.findUnique({
      where: { userId_jobId: { userId, jobId } },
      select: { id: true },
    });

    if (existing) {
      await db.savedJob.delete({ where: { id: existing.id } });
      return { saved: false };
    }

    await db.savedJob.create({ data: { userId, jobId } });
    return { saved: true };
  },

  /** Saved jobs, with whether each is still open. The job row is referenced, not copied. */
  async listSaved(userId: string) {
    const rows = await db.savedJob.findMany({
      where: { userId, job: { isDemo: false } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, job: { select: JOB_CARD_SELECT } },
    });
    return rows.map((row) => ({ ...row, live: isLive(row.job) }));
  },

  /** Remove every saved job that has closed. */
  async removeClosedSaved(userId: string) {
    const rows = await JobService.listSaved(userId);
    const closed = rows.filter((row) => !row.live).map((row) => row.id);
    if (closed.length)
      await db.savedJob.deleteMany({ where: { id: { in: closed }, userId } });
    return closed.length;
  },
};

async function savedJobIds(userId: string) {
  const rows = await db.savedJob.findMany({
    where: { userId },
    select: { jobId: true },
  });
  return new Set(rows.map((row) => row.jobId));
}
