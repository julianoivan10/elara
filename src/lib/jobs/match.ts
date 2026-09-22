import type { EmploymentType, LocationType } from "@prisma/client";

import { canonicalSkill, skillKey } from "@/lib/jobs/skills";

/**
 * Deterministic, explainable job matching against the Career Profile.
 *
 * Two stages, both cheap and both explainable:
 *   1. Hard filters — only from preferences the person actually set. A job
 *      that does not say its workplace or contract passes (unknown is not a
 *      mismatch); a job that says the wrong one does not.
 *   2. Evidence — which of the posting's skills the profile shows, *where*
 *      the profile shows them, which roles and projects are relevant, and what
 *      the posting names that the profile does not.
 *
 * There is no percentage. `rank` orders results internally; what the person
 * sees is the evidence itself, drawn only from their own profile.
 */

export type MatchProfile = {
  skills: string[];
  targetRoles: string[];
  headline: string | null;
  roles: { role: string; company: string; skills: string[] }[];
  projects: { name: string; technologies: string[] }[];
  preferredLocationTypes: LocationType[];
  preferredEmploymentTypes: EmploymentType[];
  preferredLocations: string[];
  desiredSalaryMin: number | null;
  desiredSalaryCurrency: string | null;
};

export type MatchJob = {
  title: string;
  skills: string[];
  locationType: LocationType | null;
  employmentType: EmploymentType | null;
  location: string;
  locations: string[];
  salaryAnnualMax: number | null;
  salaryCurrency: string | null;
};

export type SkillEvidence = { skill: string; where: string[] };

export type MatchResult = {
  eligible: boolean;
  /** Why a hard filter excluded the job (only when !eligible). */
  excludedBecause: string | null;
  strengths: SkillEvidence[];
  gaps: string[];
  relevant: { label: string; kind: "role" | "project"; overlap: string[] }[];
  /** "Matches your target role “Frontend Engineer”", when it does. */
  roleFit: string | null;
  notes: string[];
  rank: number;
};

const STOP = new Set([
  "and",
  "the",
  "of",
  "for",
  "to",
  "a",
  "in",
  "at",
  "with",
  "senior",
  "junior",
  "lead",
  "staff",
  "sr",
  "jr",
  "i",
  "ii",
  "iii",
  "-",
  "/",
  "&",
]);

function titleTokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9+#.]+/g, " ")
      .split(" ")
      .map((t) => t.replace(/\.$/, ""))
      .filter((t) => t.length > 1 && !STOP.has(t)),
  );
}

function overlapRatio(a: Set<string>, b: Set<string>) {
  if (a.size === 0 || b.size === 0) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n / Math.min(a.size, b.size);
}

function humanType(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace("onsite", "on-site");
}

/** Where each skill appears in the profile: the evidence, never an inference. */
export function profileSkillEvidence(
  profile: MatchProfile,
): Map<string, { skill: string; where: Set<string> }> {
  const map = new Map<string, { skill: string; where: Set<string> }>();
  const add = (name: string, where: string) => {
    const canonical = canonicalSkill(name);
    if (!canonical) return;
    const key = canonical.toLowerCase();
    const entry = map.get(key) ?? {
      skill: canonical,
      where: new Set<string>(),
    };
    entry.where.add(where);
    map.set(key, entry);
  };
  for (const skill of profile.skills) add(skill, "Skills");
  for (const role of profile.roles)
    for (const skill of role.skills)
      add(skill, `${role.role} at ${role.company}`);
  for (const project of profile.projects)
    for (const tech of project.technologies)
      add(tech, `${project.name} (project)`);
  return map;
}

export function matchJob(
  profile: MatchProfile,
  job: MatchJob,
  evidence = profileSkillEvidence(profile),
): MatchResult {
  const result: MatchResult = {
    eligible: true,
    excludedBecause: null,
    strengths: [],
    gaps: [],
    relevant: [],
    roleFit: null,
    notes: [],
    rank: 0,
  };

  /* ---------------------------------------------------- 1. hard filters */

  if (
    profile.preferredLocationTypes.length &&
    job.locationType &&
    !profile.preferredLocationTypes.includes(job.locationType)
  ) {
    return {
      ...result,
      eligible: false,
      excludedBecause: `${humanType(job.locationType)}, and you prefer ${profile.preferredLocationTypes.map(humanType).join(" or ")}`,
    };
  }
  if (
    profile.preferredEmploymentTypes.length &&
    job.employmentType &&
    !profile.preferredEmploymentTypes.includes(job.employmentType)
  ) {
    return {
      ...result,
      eligible: false,
      excludedBecause: `${humanType(job.employmentType)}, and you prefer ${profile.preferredEmploymentTypes.map(humanType).join(" or ")}`,
    };
  }
  if (profile.preferredLocations.length && job.locationType !== "REMOTE") {
    const where = `${job.location} ${job.locations.join(" ")}`.toLowerCase();
    const hit = profile.preferredLocations.find((place) =>
      where.includes(place.toLowerCase().trim()),
    );
    if (!hit) {
      return {
        ...result,
        eligible: false,
        excludedBecause: `based in ${job.location}, outside the places you listed`,
      };
    }
    result.notes.push(`In ${hit}, one of your preferred locations`);
  }
  if (
    profile.desiredSalaryMin &&
    profile.desiredSalaryCurrency &&
    job.salaryAnnualMax != null &&
    job.salaryCurrency === profile.desiredSalaryCurrency &&
    job.salaryAnnualMax < profile.desiredSalaryMin
  ) {
    return {
      ...result,
      eligible: false,
      excludedBecause: "its stated pay is below your minimum",
    };
  }

  /* ---------------------------------------------------------- 2. evidence */

  const jobSkills = [...new Set(job.skills.map(canonicalSkill))];
  for (const skill of jobSkills) {
    const have = evidence.get(skill.toLowerCase());
    if (have)
      result.strengths.push({
        skill: have.skill,
        where: [...have.where].slice(0, 3),
      });
    else result.gaps.push(skill);
  }

  const jobKeys = new Set(jobSkills.map(skillKey));
  const jobTitle = titleTokens(job.title);

  for (const role of profile.roles) {
    const overlap = role.skills
      .filter((s) => jobKeys.has(skillKey(s)))
      .map(canonicalSkill);
    if (
      overlap.length ||
      overlapRatio(titleTokens(role.role), jobTitle) >= 0.5
    ) {
      result.relevant.push({
        label: `${role.role} at ${role.company}`,
        kind: "role",
        overlap: [...new Set(overlap)],
      });
    }
  }
  for (const project of profile.projects) {
    const overlap = project.technologies
      .filter((t) => jobKeys.has(skillKey(t)))
      .map(canonicalSkill);
    if (overlap.length)
      result.relevant.push({
        label: project.name,
        kind: "project",
        overlap: [...new Set(overlap)],
      });
  }
  result.relevant.sort((a, b) => b.overlap.length - a.overlap.length);
  result.relevant = result.relevant.slice(0, 4);

  const target = profile.targetRoles.find(
    (role) => overlapRatio(titleTokens(role), jobTitle) >= 0.5,
  );
  if (target) result.roleFit = `Matches your target role “${target}”`;
  else if (
    profile.headline &&
    overlapRatio(titleTokens(profile.headline), jobTitle) >= 0.5
  ) {
    result.roleFit = "Close to the headline on your profile";
  }

  if (
    job.locationType === "REMOTE" &&
    profile.preferredLocationTypes.includes("REMOTE")
  )
    result.notes.push("Remote, as you prefer");
  if (!job.locationType && profile.preferredLocationTypes.length)
    result.notes.push("Workplace not stated in the posting");
  if (job.salaryAnnualMax == null && profile.desiredSalaryMin)
    result.notes.push("Salary not provided");

  // Internal ordering only: evidence first, then fit, then preferences.
  const coverage = jobSkills.length
    ? result.strengths.length / jobSkills.length
    : 0;
  result.rank =
    result.strengths.length * 3 +
    coverage * 6 +
    (target ? 8 : result.roleFit ? 4 : 0) +
    Math.min(result.relevant.length, 3) * 2 +
    result.notes.filter((n) => !/not (stated|provided)/.test(n)).length;

  return result;
}

/** Whether the profile holds enough to match on at all. */
export function canMatch(profile: MatchProfile) {
  return (
    profile.skills.length > 0 ||
    profile.targetRoles.length > 0 ||
    profile.roles.some((r) => r.skills.length > 0) ||
    profile.projects.some((p) => p.technologies.length > 0)
  );
}
