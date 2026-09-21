import "server-only";

import { db } from "@/server/db";

/**
 * CareerService owns the Career Profile: the single record of what a person has
 * actually done. Resumes, the AI assistant and the dashboard all read from here
 * rather than keeping their own copies.
 */

const orderBySort = { sortIndex: "asc" as const };

export type FullProfile = NonNullable<
  Awaited<ReturnType<typeof CareerService.getProfile>>
>;

export const CareerService = {
  /** The whole profile with every section, ordered as the user arranged it. */
  async getProfile(userId: string) {
    return db.profile.findUnique({
      where: { userId },
      include: {
        // The contact email lives on the account, not the profile — there is
        // one address per user and it is already verified there.
        user: { select: { email: true } },
        links: { orderBy: orderBySort },
        education: { orderBy: [orderBySort, { startDate: "desc" }] },
        experience: { orderBy: [orderBySort, { startDate: "desc" }] },
        projects: { orderBy: [orderBySort, { startDate: "desc" }] },
        skills: { orderBy: [orderBySort, { name: "asc" }] },
        certifications: { orderBy: orderBySort },
        languages: { orderBy: orderBySort },
        achievements: { orderBy: orderBySort },
      },
    });
  },

  /**
   * Just the skill names, for job matching. The job pages need nothing else
   * from the profile, so they should not pay for loading all of it.
   */
  async getSkillNames(userId: string): Promise<string[]> {
    const skills = await db.skill.findMany({
      where: { profile: { userId } },
      orderBy: orderBySort,
      select: { name: true },
    });
    return skills.map((skill) => skill.name);
  },

  /** Create on demand so the workspace never faces a missing profile. */
  async ensureProfile(userId: string, fallbackName: string) {
    return db.profile.upsert({
      where: { userId },
      update: {},
      create: { userId, fullName: fallbackName },
    });
  },

  /**
   * The next free position in a section, so a new entry lands at the end
   * instead of fighting whatever order the user has set.
   */
  async nextSortIndex(
    profileId: string,
    model:
      | "link"
      | "education"
      | "experience"
      | "project"
      | "skill"
      | "certification"
      | "language"
      | "achievement",
  ) {
    // Prisma's delegates are structurally identical for this query; the cast
    // keeps one helper instead of eight copies.
    const delegate = db[model] as unknown as {
      aggregate: (
        args: unknown,
      ) => Promise<{ _max: { sortIndex: number | null } }>;
    };

    const result = await delegate.aggregate({
      where: { profileId },
      _max: { sortIndex: true },
    });

    return (result._max.sortIndex ?? -1) + 1;
  },
};
