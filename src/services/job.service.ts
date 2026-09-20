import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";

/**
 * JobService: discovery, filtering and saving.
 *
 * Filters are parsed from the URL, which keeps a search shareable and the back
 * button meaningful. Everything is validated here rather than trusted, because
 * these values reach a database query.
 */
export const jobFiltersSchema = z.object({
  q: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  remote: z.enum(["ONSITE", "HYBRID", "REMOTE"]).optional().catch(undefined),
  type: z
    .enum([
      "FULL_TIME",
      "PART_TIME",
      "CONTRACT",
      "INTERNSHIP",
      "FREELANCE",
      "VOLUNTEER",
    ])
    .optional()
    .catch(undefined),
  seniority: z
    .enum(["INTERNSHIP", "ENTRY", "MID", "SENIOR", "LEAD"])
    .optional()
    .catch(undefined),
  skill: z.string().trim().max(60).optional(),
  minSalary: z.coerce
    .number()
    .int()
    .min(0)
    .max(1_000_000)
    .optional()
    .catch(undefined),
  sort: z.enum(["recent", "salary"]).default("recent").catch("recent"),
  page: z.coerce.number().int().min(1).max(500).default(1).catch(1),
});

export type JobFilters = z.infer<typeof jobFiltersSchema>;

export const JOBS_PER_PAGE = 12;

function buildWhere(filters: JobFilters): Prisma.JobWhereInput {
  const and: Prisma.JobWhereInput[] = [];

  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q, mode: "insensitive" } },
        { company: { contains: filters.q, mode: "insensitive" } },
        { summary: { contains: filters.q, mode: "insensitive" } },
        { skills: { hasSome: [filters.q] } },
      ],
    });
  }

  if (filters.location) {
    and.push({ location: { contains: filters.location, mode: "insensitive" } });
  }
  if (filters.remote) and.push({ locationType: filters.remote });
  if (filters.type) and.push({ employmentType: filters.type });
  if (filters.seniority) and.push({ seniority: filters.seniority });
  if (filters.skill) and.push({ skills: { has: filters.skill } });

  // Treat "no stated salary" as not matching a minimum, rather than hiding it
  // from unfiltered results.
  if (filters.minSalary) {
    and.push({
      OR: [
        { salaryMax: { gte: filters.minSalary } },
        { salaryMin: { gte: filters.minSalary } },
      ],
    });
  }

  return and.length ? { AND: and } : {};
}

export const JobService = {
  async search(filters: JobFilters, userId?: string) {
    const where = buildWhere(filters);
    const skip = (filters.page - 1) * JOBS_PER_PAGE;

    const [jobs, total, savedIds] = await Promise.all([
      db.job.findMany({
        where,
        orderBy:
          filters.sort === "salary"
            ? [{ salaryMax: "desc" }, { postedAt: "desc" }]
            : [{ postedAt: "desc" }],
        skip,
        take: JOBS_PER_PAGE,
      }),
      db.job.count({ where }),
      userId
        ? db.savedJob
            .findMany({ where: { userId }, select: { jobId: true } })
            .then((rows) => rows.map((row) => row.jobId))
        : Promise.resolve([]),
    ]);

    const saved = new Set(savedIds);

    return {
      jobs: jobs.map((job) => ({ ...job, saved: saved.has(job.id) })),
      total,
      page: filters.page,
      pages: Math.max(1, Math.ceil(total / JOBS_PER_PAGE)),
    };
  },

  async get(jobId: string, userId?: string) {
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job) return null;

    const [saved, application] = userId
      ? await Promise.all([
          db.savedJob.findUnique({
            where: { userId_jobId: { userId, jobId } },
            select: { id: true },
          }),
          db.application.findFirst({
            where: { userId, jobId },
            select: { id: true, status: true },
          }),
        ])
      : [null, null];

    return { ...job, saved: Boolean(saved), application };
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

  async listSaved(userId: string) {
    return db.savedJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { job: true },
    });
  },

  /** Every distinct skill in the catalogue, for the filter rail. */
  async popularSkills(limit = 18) {
    const jobs = await db.job.findMany({ select: { skills: true } });
    const counts = new Map<string, number>();

    for (const job of jobs) {
      for (const skill of job.skills) {
        counts.set(skill, (counts.get(skill) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  },
};
