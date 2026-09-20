import { describe, expect, it } from "vitest";

import { skillMatch } from "@/lib/skill-match";

/**
 * The match is shown to people as a statement of fact — "you have 7 of the 9
 * things this asks for" — so it has to be exactly as strict as it claims.
 */
describe("skillMatch", () => {
  it("splits what the posting asks for into matched and missing", () => {
    const result = skillMatch(
      ["TypeScript", "React", "GraphQL"],
      ["TypeScript", "React", "CSS"],
    );

    expect(result.matched).toEqual(["TypeScript", "React"]);
    expect(result.missing).toEqual(["GraphQL"]);
    expect(result.percent).toBe(67);
  });

  it("ignores case and surrounding whitespace", () => {
    const result = skillMatch(["TypeScript"], ["  typescript "]);
    expect(result.matched).toEqual(["TypeScript"]);
    expect(result.missing).toEqual([]);
  });

  it("does not match on a partial word", () => {
    // "React" must not be satisfied by "React Native"; a near-miss claimed as a
    // match would be a lie on someone's behalf.
    const result = skillMatch(["React"], ["React Native"]);
    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual(["React"]);
  });

  it("returns 0% rather than dividing by zero when nothing is asked for", () => {
    const result = skillMatch([], ["TypeScript"]);
    expect(result.percent).toBe(0);
    expect(result.matched).toEqual([]);
  });

  it("returns everything missing when the profile has no skills", () => {
    const result = skillMatch(["TypeScript", "React"], []);
    expect(result.missing).toHaveLength(2);
    expect(result.percent).toBe(0);
  });

  it("reaches 100% only when every asked-for skill is present", () => {
    const result = skillMatch(["TypeScript"], ["TypeScript", "React"]);
    expect(result.percent).toBe(100);
  });

  it("preserves the posting's own spelling in the output", () => {
    const result = skillMatch(["TypeScript"], ["typescript"]);
    expect(result.matched[0]).toBe("TypeScript");
  });
});
