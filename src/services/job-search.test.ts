import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));

const {
  buildJobWhere,
  hasActiveFilters,
  isLive,
  jobFiltersSchema,
  liveJobWhere,
} = await import("@/services/job.service");

const NOW = new Date("2026-09-22T00:00:00Z");
const parse = (raw: Record<string, string>) => jobFiltersSchema.parse(raw);
const clauses = (raw: Record<string, string>) =>
  (buildJobWhere(parse(raw), NOW) as { AND: Record<string, unknown>[] }).AND;

describe("jobFiltersSchema", () => {
  it("accepts shareable URL filters", () => {
    expect(
      parse({ q: "frontend", location: "Jakarta", remote: "true", page: "2" }),
    ).toMatchObject({
      q: "frontend",
      location: "Jakarta",
      remote: "REMOTE",
      page: 2,
      sort: "recent",
    });
  });

  it("degrades hand-edited junk to defaults instead of failing", () => {
    expect(
      parse({
        remote: "sideways",
        type: "FOREVER",
        source: "linkedin",
        posted: "999",
        page: "-4",
        currency: "dollars",
        minSalary: "abc",
      }),
    ).toMatchObject({
      remote: undefined,
      type: undefined,
      source: undefined,
      posted: undefined,
      page: 1,
      currency: undefined,
      minSalary: undefined,
    });
  });

  it("knows when filters are active", () => {
    expect(hasActiveFilters(parse({}))).toBe(false);
    expect(hasActiveFilters(parse({ page: "3", sort: "recent" }))).toBe(false);
    expect(hasActiveFilters(parse({ source: "lever" }))).toBe(true);
  });
});

describe("buildJobWhere", () => {
  it("always restricts to live, real listings", () => {
    const live = clauses({})[0];
    expect(live).toMatchObject({ isDemo: false, isActive: true });
    expect(live).toEqual(liveJobWhere(NOW));
  });

  it("searches title, company, department, summary and skills", () => {
    const q = clauses({ q: "postgres" })[1] as {
      OR: Record<string, unknown>[];
    };
    expect(q.OR).toEqual(
      expect.arrayContaining([
        { title: { contains: "postgres", mode: "insensitive" } },
        { skills: { has: "PostgreSQL" } }, // canonical skill name
      ]),
    );
  });

  it("filters location across every listed location, case-insensitively", () => {
    expect(clauses({ location: "JAKARTA" })).toContainEqual({
      locationSearch: { contains: "jakarta" },
    });
  });

  it("filters workplace, contract, level, source and skill", () => {
    const where = clauses({
      remote: "HYBRID",
      type: "CONTRACT",
      seniority: "SENIOR",
      source: "greenhouse",
      skill: "nextjs",
    });
    expect(where).toEqual(
      expect.arrayContaining([
        { locationType: "HYBRID" },
        { employmentType: "CONTRACT" },
        { seniority: "SENIOR" },
        { source: "greenhouse" },
        { skills: { has: "Next.js" } },
      ]),
    );
  });

  it("filters by date posted", () => {
    expect(clauses({ posted: "7" })).toContainEqual({
      postedAt: { gte: new Date("2026-09-15T00:00:00Z") },
    });
  });

  it("compares salary as yearly pay within the chosen currency only", () => {
    const where = clauses({ currency: "sgd", minSalary: "90000" });
    expect(where).toEqual(
      expect.arrayContaining([
        { salaryCurrency: "SGD" },
        { salaryAnnualMax: { gte: 90000 } },
        { salaryAnnualMax: { not: null } },
      ]),
    );
  });
});

describe("isLive", () => {
  const base = {
    isActive: true,
    isDemo: false,
    lastSeenAt: NOW,
    expiresAt: null,
  };
  it("matches the live rule for rows loaded another way", () => {
    expect(isLive(base, NOW)).toBe(true);
    expect(isLive({ ...base, isActive: false }, NOW)).toBe(false);
    expect(isLive({ ...base, isDemo: true }, NOW)).toBe(false);
    expect(isLive({ ...base, lastSeenAt: new Date("2026-08-01") }, NOW)).toBe(
      false,
    );
    expect(isLive({ ...base, expiresAt: new Date("2026-09-01") }, NOW)).toBe(
      false,
    );
  });
});
