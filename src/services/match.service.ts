import "server-only";
import type { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import {
  canMatch,
  matchJob,
  profileSkillEvidence,
  type MatchProfile,
  type MatchResult,
} from "@/lib/jobs/match";
import { canonicalSkill } from "@/lib/jobs/skills";
import {
  JOB_CARD_SELECT,
  liveJobWhere,
  type JobCardData,
} from "@/services/job.service";

/**
 * MatchService: the database side of career matching.
 *
 * Pipeline: every live job → SQL pre-filter (shares a skill, or a target-role
 * word, with the profile; honours hard preferences the database can check)
 * → at most CANDIDATES rows → deterministic scoring in memory → the few best.
 * Gemini is never part of this; it is only asked, on request, about the top
 * few (see ai.actions reviewMatchesAction).
 */

const CANDIDATES = 150;

/** Only what scoring reads; full card data is fetched for the winners alone. */
const SCORING_SELECT = {
  id: true,
  title: true,
  skills: true,
  locationType: true,
  employmentType: true,
  location: true,
  locations: true,
  salaryAnnualMax: true,
  salaryCurrency: true,
} satisfies Prisma.JobSelect;

const PROFILE_SELECT = {
  headline: true,
  targetRoles: true,
  preferredLocationTypes: true,
  preferredEmploymentTypes: true,
  preferredLocations: true,
  desiredSalaryMin: true,
  desiredSalaryCurrency: true,
  skills: { select: { name: true } },
  experience: { select: { role: true, company: true, skills: true } },
  projects: { select: { name: true, technologies: true } },
} satisfies Prisma.ProfileSelect;

export async function loadMatchProfile(
  userId: string,
): Promise<MatchProfile | null> {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: PROFILE_SELECT,
  });
  if (!profile) return null;
  return {
    skills: profile.skills.map((s) => s.name),
    targetRoles: profile.targetRoles,
    headline: profile.headline,
    roles: profile.experience.map((e) => ({
      role: e.role,
      company: e.company,
      skills: e.skills,
    })),
    projects: profile.projects.map((p) => ({
      name: p.name,
      technologies: p.technologies,
    })),
    preferredLocationTypes: profile.preferredLocationTypes,
    preferredEmploymentTypes: profile.preferredEmploymentTypes,
    preferredLocations: profile.preferredLocations,
    desiredSalaryMin: profile.desiredSalaryMin,
    desiredSalaryCurrency: profile.desiredSalaryCurrency,
  };
}

export type Recommendation = {
  job: JobCardData & { saved: boolean };
  match: MatchResult;
};

export const MatchService = {
  async recommend(
    userId: string,
    limit = 5,
  ): Promise<{ ready: boolean; items: Recommendation[] }> {
    // Independent reads, in parallel: the profile, and what is already tracked
    // or saved (neither needs the profile to be known first).
    const [profile, tracked, saved] = await Promise.all([
      loadMatchProfile(userId),
      db.application.findMany({
        where: { userId, jobId: { not: null } },
        select: { jobId: true },
      }),
      db.savedJob.findMany({ where: { userId }, select: { jobId: true } }),
    ]);
    if (!profile || !canMatch(profile)) return { ready: false, items: [] };

    const evidence = profileSkillEvidence(profile);
    const skillNames = [...evidence.values()].map((e) => e.skill);
    const roleWords = [
      ...new Set(
        profile.targetRoles
          .flatMap((r) => r.split(/\s+/))
          .filter((w) => w.length > 3),
      ),
    ].slice(0, 8);

    const where: Prisma.JobWhereInput = {
      AND: [
        liveJobWhere(),
        {
          OR: [
            ...(skillNames.length ? [{ skills: { hasSome: skillNames } }] : []),
            ...roleWords.map((w) => ({
              title: { contains: w, mode: "insensitive" as const },
            })),
          ],
        },
        // Preferences the database can apply cheaply; unknown values pass.
        ...(profile.preferredLocationTypes.length
          ? [
              {
                OR: [
                  { locationType: null },
                  { locationType: { in: profile.preferredLocationTypes } },
                ],
              },
            ]
          : []),
        ...(profile.preferredEmploymentTypes.length
          ? [
              {
                OR: [
                  { employmentType: null },
                  { employmentType: { in: profile.preferredEmploymentTypes } },
                ],
              },
            ]
          : []),
      ],
    };

    const candidates = await db.job.findMany({
      where,
      select: SCORING_SELECT,
      orderBy: [{ postedAt: { sort: "desc", nulls: "last" } }],
      take: CANDIDATES,
    });

    // Jobs already on the tracker are not "recommended" again.
    const skip = new Set(tracked.map((t) => t.jobId));
    const savedIds = new Set(saved.map((s) => s.jobId));

    const top = candidates
      .filter((job) => !skip.has(job.id))
      .map((job) => ({ id: job.id, match: matchJob(profile, job, evidence) }))
      .filter(
        (item) =>
          item.match.eligible &&
          (item.match.strengths.length > 0 || item.match.roleFit),
      )
      .sort((a, b) => b.match.rank - a.match.rank)
      .slice(0, limit);
    if (top.length === 0) return { ready: true, items: [] };

    const cards = await db.job.findMany({
      where: { id: { in: top.map((t) => t.id) } },
      select: JOB_CARD_SELECT,
    });
    const byId = new Map(cards.map((card) => [card.id, card]));

    const items = top
      .filter((t) => byId.has(t.id))
      .map((t) => ({
        job: { ...byId.get(t.id)!, saved: savedIds.has(t.id) },
        match: t.match,
      }));

    return { ready: true, items };
  },

  /** Match one job (the detail page), including hard-filter exclusions. */
  async forJob(
    userId: string,
    job: Parameters<typeof matchJob>[1],
  ): Promise<{ ready: boolean; match: MatchResult | null }> {
    const profile = await loadMatchProfile(userId);
    if (!profile || !canMatch(profile)) return { ready: false, match: null };
    return {
      ready: true,
      match: matchJob(profile, {
        ...job,
        skills: job.skills.map(canonicalSkill),
      }),
    };
  },
};
