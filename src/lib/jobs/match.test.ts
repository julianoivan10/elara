import { describe, expect, it } from "vitest";

import {
  canMatch,
  matchJob,
  type MatchJob,
  type MatchProfile,
} from "@/lib/jobs/match";

const profile = (over: Partial<MatchProfile> = {}): MatchProfile => ({
  skills: ["React", "typescript", "postgres"],
  targetRoles: ["Frontend Engineer"],
  headline: "Frontend developer",
  roles: [
    {
      role: "Frontend Developer",
      company: "BlockLens",
      skills: ["React", "Next.js"],
    },
  ],
  projects: [
    { name: "Elara", technologies: ["Next.js", "PostgreSQL", "Prisma"] },
  ],
  preferredLocationTypes: [],
  preferredEmploymentTypes: [],
  preferredLocations: [],
  desiredSalaryMin: null,
  desiredSalaryCurrency: null,
  ...over,
});

const job = (over: Partial<MatchJob> = {}): MatchJob => ({
  title: "Senior Frontend Engineer",
  skills: ["React", "TypeScript", "PostgreSQL", "AWS"],
  locationType: "REMOTE",
  employmentType: "FULL_TIME",
  location: "Remote, Asia",
  locations: ["Remote, Asia"],
  salaryAnnualMax: null,
  salaryCurrency: null,
  ...over,
});

describe("matchJob evidence", () => {
  it("lists matched skills with where the profile shows them", () => {
    const result = matchJob(profile(), job());
    expect(result.eligible).toBe(true);
    expect(result.strengths).toEqual([
      { skill: "React", where: ["Skills", "Frontend Developer at BlockLens"] },
      { skill: "TypeScript", where: ["Skills"] },
      { skill: "PostgreSQL", where: ["Skills", "Elara (project)"] },
    ]);
    expect(result.gaps).toEqual(["AWS"]);
  });

  it("names relevant roles and projects by their overlap", () => {
    const result = matchJob(
      profile(),
      job({ skills: ["Next.js", "PostgreSQL"] }),
    );
    expect(result.relevant).toEqual(
      expect.arrayContaining([
        { label: "Elara", kind: "project", overlap: ["Next.js", "PostgreSQL"] },
        {
          label: "Frontend Developer at BlockLens",
          kind: "role",
          overlap: ["Next.js"],
        },
      ]),
    );
  });

  it("recognises a target role in the title", () => {
    expect(matchJob(profile(), job()).roleFit).toBe(
      "Matches your target role “Frontend Engineer”",
    );
    expect(
      matchJob(profile(), job({ title: "Data Scientist" })).roleFit,
    ).toBeNull();
  });

  it("never reports a skill the profile does not contain", () => {
    const result = matchJob(
      profile({ skills: [], roles: [], projects: [] }),
      job(),
    );
    expect(result.strengths).toEqual([]);
    expect(result.gaps).toEqual(["React", "TypeScript", "PostgreSQL", "AWS"]);
  });

  it("ranks stronger evidence higher, without a percentage anywhere", () => {
    const strong = matchJob(profile(), job());
    const weak = matchJob(
      profile(),
      job({ title: "Designer", skills: ["Figma"] }),
    );
    expect(strong.rank).toBeGreaterThan(weak.rank);
    expect(JSON.stringify(strong)).not.toMatch(/%/);
  });
});

describe("matchJob hard filters", () => {
  it("excludes a stated workplace the person does not want", () => {
    const result = matchJob(
      profile({ preferredLocationTypes: ["REMOTE"] }),
      job({ locationType: "ONSITE" }),
    );
    expect(result.eligible).toBe(false);
    expect(result.excludedBecause).toContain("on-site");
  });

  it("lets an unstated workplace through, with a note", () => {
    const result = matchJob(
      profile({ preferredLocationTypes: ["REMOTE"] }),
      job({ locationType: null }),
    );
    expect(result.eligible).toBe(true);
    expect(result.notes).toContain("Workplace not stated in the posting");
  });

  it("filters by preferred locations, but remote always passes", () => {
    const p = profile({ preferredLocations: ["Jakarta"] });
    expect(
      matchJob(
        p,
        job({
          locationType: "ONSITE",
          location: "London",
          locations: ["London"],
        }),
      ).eligible,
    ).toBe(false);
    expect(
      matchJob(
        p,
        job({
          locationType: "HYBRID",
          location: "Jakarta, Indonesia",
          locations: ["Jakarta, Indonesia"],
        }),
      ).eligible,
    ).toBe(true);
    expect(
      matchJob(p, job({ locationType: "REMOTE", location: "Remote" })).eligible,
    ).toBe(true);
  });

  it("compares pay only within the same currency", () => {
    const p = profile({
      desiredSalaryMin: 100000,
      desiredSalaryCurrency: "USD",
    });
    expect(
      matchJob(p, job({ salaryAnnualMax: 80000, salaryCurrency: "USD" }))
        .eligible,
    ).toBe(false);
    expect(
      matchJob(p, job({ salaryAnnualMax: 80000, salaryCurrency: "SGD" }))
        .eligible,
    ).toBe(true);
    const unstated = matchJob(p, job({ salaryAnnualMax: null }));
    expect(unstated.eligible).toBe(true);
    expect(unstated.notes).toContain("Salary not provided");
  });

  it("excludes a stated contract type the person does not want", () => {
    const p = profile({ preferredEmploymentTypes: ["FULL_TIME"] });
    expect(matchJob(p, job({ employmentType: "INTERNSHIP" })).eligible).toBe(
      false,
    );
    expect(matchJob(p, job({ employmentType: null })).eligible).toBe(true);
  });
});

describe("canMatch", () => {
  it("needs at least skills or target roles", () => {
    expect(canMatch(profile())).toBe(true);
    expect(
      canMatch(
        profile({ skills: [], targetRoles: [], roles: [], projects: [] }),
      ),
    ).toBe(false);
  });
});
