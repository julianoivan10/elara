import { describe, expect, it } from "vitest";

import { computeCompletion, type CompletionInput } from "@/lib/completion";

/**
 * Completion drives the advice a person is given about their own profile, so
 * the weighting has to mean something: a role with results written down must
 * count for more than a phone number.
 */
function input(overrides: Partial<CompletionInput> = {}): CompletionInput {
  return {
    fullName: "",
    headline: null,
    summary: null,
    location: null,
    links: [],
    experience: [],
    education: [],
    projects: [],
    skills: [],
    languages: [],
    certifications: [],
    ...overrides,
  };
}

describe("computeCompletion", () => {
  it("is 0% for an entirely empty profile", () => {
    expect(computeCompletion(input()).percent).toBe(0);
  });

  it("is 0% for a missing profile rather than throwing", () => {
    expect(computeCompletion(null).percent).toBe(0);
  });

  it("is 100% when everything is filled in", () => {
    const full = input({
      fullName: "Amara Ilunga",
      headline: "Front-end engineer",
      summary: "A summary.",
      location: "Lisbon",
      links: [{}],
      experience: [{ highlights: ["Did a thing"] }],
      education: [{}],
      projects: [{}],
      skills: [{}, {}, {}, {}, {}],
      languages: [{}],
      certifications: [],
    });

    expect(computeCompletion(full).percent).toBe(100);
    expect(computeCompletion(full).next).toEqual([]);
  });

  it("treats whitespace-only text as unfilled", () => {
    const blank = computeCompletion(input({ fullName: "   ", headline: "  " }));
    expect(blank.percent).toBe(0);
  });

  it("does not credit results until a role actually has highlights", () => {
    const withoutResults = computeCompletion(
      input({ experience: [{ highlights: [] }] }),
    );
    const withResults = computeCompletion(
      input({ experience: [{ highlights: ["Shipped something"] }] }),
    );

    expect(withResults.percent).toBeGreaterThan(withoutResults.percent);
    expect(
      withoutResults.items.find((item) => item.key === "highlights")?.done,
    ).toBe(false);
  });

  it("needs five skills before the skills item counts", () => {
    const four = computeCompletion(input({ skills: [{}, {}, {}, {}] }));
    const five = computeCompletion(input({ skills: [{}, {}, {}, {}, {}] }));

    expect(four.items.find((i) => i.key === "skills")?.done).toBe(false);
    expect(five.items.find((i) => i.key === "skills")?.done).toBe(true);
  });

  it("counts either languages or certifications for the extras item", () => {
    const withLanguage = computeCompletion(input({ languages: [{}] }));
    const withCertification = computeCompletion(
      input({ certifications: [{}] }),
    );

    expect(withLanguage.items.find((i) => i.key === "extras")?.done).toBe(true);
    expect(withCertification.items.find((i) => i.key === "extras")?.done).toBe(
      true,
    );
  });

  it("suggests the heaviest unfinished items first", () => {
    const next = computeCompletion(input({ fullName: "Amara" })).next;

    expect(next).toHaveLength(3);
    // Descending by weight, so the advice is always worth taking.
    expect(next[0].weight).toBeGreaterThanOrEqual(next[1].weight);
    expect(next[1].weight).toBeGreaterThanOrEqual(next[2].weight);
    // Experience outweighs anything cosmetic.
    expect(next[0].key).toBe("experience");
  });

  it("weights a role far above a location", () => {
    const withRole = computeCompletion(
      input({ experience: [{ highlights: [] }] }),
    ).percent;
    const withLocation = computeCompletion(
      input({ location: "Lisbon" }),
    ).percent;

    expect(withRole).toBeGreaterThan(withLocation);
  });

  it("always reports a percentage between 0 and 100", () => {
    const partial = computeCompletion(
      input({ fullName: "A", headline: "B", skills: [{}, {}] }),
    );

    expect(partial.percent).toBeGreaterThanOrEqual(0);
    expect(partial.percent).toBeLessThanOrEqual(100);
  });
});
