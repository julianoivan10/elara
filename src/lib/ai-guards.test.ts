import { describe, expect, it } from "vitest";

import {
  appearsIn,
  containsInventedNumbers,
  dedupe,
  parseJsonObject,
} from "@/lib/ai-guards";

describe("parseJsonObject", () => {
  it("parses a bare object", () => {
    expect(parseJsonObject('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
  });

  it("unwraps code fences and stray prose", () => {
    const text = 'Here you go:\n```json\n{"suggestions":["x"]}\n```';
    expect(parseJsonObject(text)).toEqual({
      ok: true,
      value: { suggestions: ["x"] },
    });
  });

  it("reports text with no object", () => {
    expect(parseJsonObject("I cannot help with that.").ok).toBe(false);
  });

  it("reports truncated JSON instead of throwing", () => {
    expect(parseJsonObject('{"suggestions":["cut off}').ok).toBe(false);
  });
});

describe("containsInventedNumbers", () => {
  it("allows numbers that were in the input", () => {
    expect(
      containsInventedNumbers(
        "Cut build time from 12 to 4 minutes",
        "made the build go from 12 min to 4",
      ),
    ).toBe(false);
  });

  it("flags a figure that was not in the input", () => {
    expect(
      containsInventedNumbers(
        "Improved checkout speed by 40%",
        "made the checkout page faster",
      ),
    ).toBe(true);
  });

  it("ignores trailing punctuation on a figure", () => {
    expect(containsInventedNumbers("Served 3 teams.", "for 3 teams")).toBe(
      false,
    );
  });
});

describe("appearsIn", () => {
  const source = "Rebuilt the component library four teams ship against.";

  it("matches ignoring case, quotes and spacing", () => {
    expect(appearsIn('"rebuilt the  Component library"', source)).toBe(true);
  });

  it("matches a quote shortened with an ellipsis", () => {
    expect(
      appearsIn("Rebuilt the component library … ship against", source),
    ).toBe(true);
  });

  it("rejects text that is not there", () => {
    expect(appearsIn("led a team of engineers", source)).toBe(false);
  });

  it("rejects an empty quote", () => {
    expect(appearsIn(" … ", source)).toBe(false);
  });
});

describe("dedupe", () => {
  it("keeps the first spelling and drops blanks", () => {
    expect(dedupe(["React", "react ", "", "Vue"])).toEqual(["React", "Vue"]);
  });
});
