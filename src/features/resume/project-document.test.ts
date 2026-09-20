import { describe, expect, it } from "vitest";

import {
  parseConfig,
  projectDocument,
  type ProjectionProfile,
  type ProjectionSection,
} from "@/features/resume/project-document";

/**
 * The projection is the heart of the product: it decides what actually appears
 * on someone's resume. These tests pin the behaviour that matters — that
 * nothing is invented, nothing is silently dropped, and overrides never leak
 * back into the profile.
 */

function profile(
  overrides: Partial<ProjectionProfile> = {},
): ProjectionProfile {
  return {
    fullName: "Amara Ilunga",
    headline: "Front-end engineer",
    summary: "A profile summary.",
    location: "Lisbon",
    phone: "+351 912 000 000",
    website: "https://amara.build",
    email: "amara@example.com",
    links: [{ id: "l1", label: "GitHub", url: "https://github.com/a" }],
    experience: [
      {
        id: "e1",
        role: "Front-end engineer",
        company: "Norwind",
        location: "Lisbon",
        locationType: "HYBRID",
        startDate: new Date("2023-03-01"),
        endDate: null,
        current: true,
        summary: null,
        highlights: ["First bullet", "Second bullet", "Third bullet"],
      },
      {
        id: "e2",
        role: "Junior developer",
        company: "Caldera",
        location: null,
        locationType: "ONSITE",
        startDate: new Date("2021-09-01"),
        endDate: new Date("2023-02-01"),
        current: false,
        summary: null,
        highlights: [],
      },
    ],
    education: [
      {
        id: "ed1",
        school: "University of Porto",
        degree: "BSc",
        field: "Informatics",
        location: "Porto",
        startDate: new Date("2018-09-01"),
        endDate: new Date("2021-07-01"),
        current: false,
        grade: "16/20",
        description: null,
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Tideline",
        role: "Design and build",
        description: "A tide reader.",
        highlights: ["Works offline"],
        technologies: ["TypeScript"],
        url: "https://amara.build/tideline",
        startDate: new Date("2024-02-01"),
        endDate: null,
        current: true,
      },
    ],
    skills: [
      { id: "s1", name: "TypeScript", category: "Languages" },
      { id: "s2", name: "React", category: "Tools" },
      { id: "s3", name: "Accessibility", category: null },
    ],
    certifications: [],
    languages: [{ id: "la1", name: "Portuguese", proficiency: "NATIVE" }],
    achievements: [],
    ...overrides,
  };
}

function sections(
  overrides: Partial<Record<string, Partial<ProjectionSection>>> = {},
): ProjectionSection[] {
  const base = [
    { kind: "HEADER", title: "Header" },
    { kind: "SUMMARY", title: "Summary" },
    { kind: "EXPERIENCE", title: "Experience" },
    { kind: "PROJECTS", title: "Projects" },
    { kind: "EDUCATION", title: "Education" },
    { kind: "SKILLS", title: "Skills" },
    { kind: "LANGUAGES", title: "Languages" },
  ];

  return base.map((section, index) => ({
    id: `sec-${section.kind}`,
    kind: section.kind,
    title: section.title,
    visible: true,
    sortIndex: index,
    config: {},
    ...(overrides[section.kind] ?? {}),
  }));
}

describe("projectDocument", () => {
  it("builds the header from the profile", () => {
    const doc = projectDocument(sections(), profile());

    expect(doc.header.name).toBe("Amara Ilunga");
    expect(doc.header.email).toBe("amara@example.com");
    expect(doc.header.links).toHaveLength(1);
  });

  it("respects contact toggles on the header section", () => {
    const doc = projectDocument(
      sections({ HEADER: { config: { showPhone: false, showEmail: false } } }),
      profile(),
    );

    expect(doc.header.phone).toBeNull();
    expect(doc.header.email).toBeNull();
    expect(doc.header.location).toBe("Lisbon");
  });

  it("renders sections in sortIndex order, not array order", () => {
    const shuffled = sections().map((section) => ({
      ...section,
      sortIndex:
        section.kind === "SKILLS"
          ? 0
          : section.kind === "SUMMARY"
            ? 99
            : section.sortIndex,
    }));

    const doc = projectDocument(shuffled, profile());
    const kinds = doc.sections.map((section) => section.kind);

    expect(kinds[0]).toBe("SKILLS");
    expect(kinds.at(-1)).toBe("SUMMARY");
  });

  it("omits hidden sections and the header section", () => {
    const doc = projectDocument(
      sections({ PROJECTS: { visible: false } }),
      profile(),
    );
    const kinds = doc.sections.map((section) => section.kind);

    expect(kinds).not.toContain("PROJECTS");
    expect(kinds).not.toContain("HEADER");
  });

  it("omits sections with nothing to show", () => {
    const doc = projectDocument(
      sections(),
      profile({ projects: [], languages: [] }),
    );
    const kinds = doc.sections.map((section) => section.kind);

    expect(kinds).not.toContain("PROJECTS");
    expect(kinds).not.toContain("LANGUAGES");
    expect(kinds).toContain("EXPERIENCE");
  });

  it("excludes only the entries listed in excludedIds", () => {
    const doc = projectDocument(
      sections({ EXPERIENCE: { config: { excludedIds: ["e2"] } } }),
      profile(),
    );

    const experience = doc.sections.find((s) => s.kind === "EXPERIENCE");
    expect(experience).toBeDefined();
    if (experience?.kind !== "EXPERIENCE") throw new Error("wrong kind");

    expect(experience.items.map((item) => item.id)).toEqual(["e1"]);
  });

  it("includes new profile entries automatically, because exclusion is opt-out", () => {
    const withExtraRole = profile();
    withExtraRole.experience.push({
      id: "e3",
      role: "Contractor",
      company: "Marrow",
      location: null,
      locationType: "REMOTE",
      startDate: new Date("2020-01-01"),
      endDate: new Date("2020-06-01"),
      current: false,
      summary: null,
      highlights: [],
    });

    const doc = projectDocument(sections(), withExtraRole);
    const experience = doc.sections.find((s) => s.kind === "EXPERIENCE");
    if (experience?.kind !== "EXPERIENCE") throw new Error("wrong kind");

    expect(experience.items.map((item) => item.id)).toContain("e3");
  });

  it("applies per-resume wording overrides without touching the profile", () => {
    const source = profile();
    const doc = projectDocument(
      sections({
        EXPERIENCE: {
          config: {
            overrides: { e1: { highlights: ["A tailored bullet"] } },
          },
        },
      }),
      source,
    );

    const experience = doc.sections.find((s) => s.kind === "EXPERIENCE");
    if (experience?.kind !== "EXPERIENCE") throw new Error("wrong kind");

    expect(experience.items[0].highlights).toEqual(["A tailored bullet"]);
    // The profile object is unchanged.
    expect(source.experience[0].highlights).toEqual([
      "First bullet",
      "Second bullet",
      "Third bullet",
    ]);
  });

  it("caps bullets with maxHighlights", () => {
    const doc = projectDocument(
      sections({ EXPERIENCE: { config: { maxHighlights: 2 } } }),
      profile(),
    );

    const experience = doc.sections.find((s) => s.kind === "EXPERIENCE");
    if (experience?.kind !== "EXPERIENCE") throw new Error("wrong kind");

    expect(experience.items[0].highlights).toHaveLength(2);
  });

  it("overrides the summary for this resume only", () => {
    const doc = projectDocument(
      sections({ SUMMARY: { config: { text: "A tailored summary." } } }),
      profile(),
    );

    const summary = doc.sections.find((s) => s.kind === "SUMMARY");
    if (summary?.kind !== "SUMMARY") throw new Error("wrong kind");

    expect(summary.body).toBe("A tailored summary.");
  });

  it("groups skills by category, and drops a lone Other label", () => {
    const grouped = projectDocument(sections(), profile());
    const skills = grouped.sections.find((s) => s.kind === "SKILLS");
    if (skills?.kind !== "SKILLS") throw new Error("wrong kind");

    expect(skills.groups.map((g) => g.label)).toEqual([
      "Languages",
      "Tools",
      "Other",
    ]);

    const single = projectDocument(
      sections(),
      profile({ skills: [{ id: "s1", name: "React", category: null }] }),
    );
    const singleSkills = single.sections.find((s) => s.kind === "SKILLS");
    if (singleSkills?.kind !== "SKILLS") throw new Error("wrong kind");

    expect(singleSkills.groups[0].label).toBeNull();
  });

  it("flattens skills into one group when grouping is off", () => {
    const doc = projectDocument(
      sections({ SKILLS: { config: { groupSkills: false } } }),
      profile(),
    );

    const skills = doc.sections.find((s) => s.kind === "SKILLS");
    if (skills?.kind !== "SKILLS") throw new Error("wrong kind");

    expect(skills.groups).toHaveLength(1);
    expect(skills.groups[0].items).toEqual([
      "TypeScript",
      "React",
      "Accessibility",
    ]);
  });

  it("formats a current role as running to Present", () => {
    const doc = projectDocument(sections(), profile());
    const experience = doc.sections.find((s) => s.kind === "EXPERIENCE");
    if (experience?.kind !== "EXPERIENCE") throw new Error("wrong kind");

    expect(experience.items[0].period).toContain("Present");
    expect(experience.items[1].period).not.toContain("Present");
  });

  it("survives an empty profile without throwing", () => {
    const doc = projectDocument(sections(), null);

    expect(doc.header.name).toBe("");
    expect(doc.sections).toEqual([]);
  });
});

describe("parseConfig", () => {
  it("fills in defaults for an empty config", () => {
    const config = parseConfig({});

    expect(config.excludedIds).toEqual([]);
    expect(config.groupSkills).toBe(true);
    expect(config.showEmail).toBe(true);
  });

  it("falls back to defaults rather than throwing on malformed stored JSON", () => {
    expect(parseConfig({ excludedIds: "not an array" }).excludedIds).toEqual(
      [],
    );
    expect(parseConfig(null).groupSkills).toBe(true);
    expect(parseConfig("nonsense").showPhone).toBe(true);
  });
});
