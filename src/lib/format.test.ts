import { describe, expect, it } from "vitest";

import {
  dateRange,
  duration,
  humanizeEnum,
  initials,
  monthYear,
  postedLabel,
  relativeTime,
  salaryRange,
} from "@/lib/format";

/**
 * Formatting reaches the printed resume, so the edge cases matter: a missing
 * date must read as absent rather than as "Invalid Date".
 */
describe("monthYear", () => {
  it("formats a date as month and year", () => {
    expect(monthYear(new Date("2023-03-15"))).toBe("Mar 2023");
  });

  it("returns null for nothing, rather than a broken string", () => {
    expect(monthYear(null)).toBeNull();
    expect(monthYear(undefined)).toBeNull();
    expect(monthYear("not a date")).toBeNull();
  });
});

describe("dateRange", () => {
  it("joins a start and an end", () => {
    expect(dateRange(new Date("2021-09-01"), new Date("2023-02-01"))).toBe(
      "Sept 2021 — Feb 2023",
    );
  });

  it("says Present for a current role", () => {
    expect(dateRange(new Date("2023-03-01"), null, true)).toBe(
      "Mar 2023 — Present",
    );
  });

  it("returns just the start when there is no end", () => {
    expect(dateRange(new Date("2023-03-01"), null, false)).toBe("Mar 2023");
  });

  it("returns null when there are no dates at all", () => {
    expect(dateRange(null, null, false)).toBeNull();
  });

  it("ignores a stored end date when the role is current", () => {
    const result = dateRange(
      new Date("2023-03-01"),
      new Date("2024-01-01"),
      true,
    );
    expect(result).toContain("Present");
    expect(result).not.toContain("2024");
  });
});

describe("duration", () => {
  it("counts years and months inclusively", () => {
    expect(duration(new Date("2021-01-01"), new Date("2022-12-01"))).toBe(
      "2 yrs",
    );
  });

  it("reports a part year", () => {
    expect(duration(new Date("2023-01-01"), new Date("2023-04-01"))).toBe(
      "4 mos",
    );
  });

  it("uses a singular for one month", () => {
    expect(duration(new Date("2023-01-01"), new Date("2023-01-01"))).toBe(
      "1 mo",
    );
  });

  it("returns null without a start date", () => {
    expect(duration(null, new Date())).toBeNull();
  });

  it("returns null when the range runs backwards", () => {
    expect(duration(new Date("2024-01-01"), new Date("2020-01-01"))).toBeNull();
  });
});

describe("salaryRange", () => {
  it("formats a range with a period suffix", () => {
    expect(
      salaryRange({
        salaryMin: 48000,
        salaryMax: 62000,
        salaryCurrency: "EUR",
        salaryPeriod: "YEAR",
      }),
    ).toMatch(/48K.+62K\/yr/);
  });

  it("formats a single figure", () => {
    expect(
      salaryRange({
        salaryMin: 300,
        salaryMax: null,
        salaryCurrency: "EUR",
        salaryPeriod: "HOUR",
      }),
    ).toContain("/hr");
  });

  it("does not guess a currency", () => {
    expect(
      salaryRange({ salaryMin: 5000, salaryMax: 7000, salaryCurrency: null }),
    ).toBeNull();
  });

  it("returns null when no salary is stated", () => {
    expect(
      salaryRange({ salaryMin: null, salaryMax: null, salaryCurrency: null }),
    ).toBeNull();
  });
});

describe("relativeTime", () => {
  it("describes recent times compactly", () => {
    const now = Date.now();
    expect(relativeTime(new Date(now - 30_000))).toBe("just now");
    expect(relativeTime(new Date(now - 5 * 60_000))).toBe("5m ago");
    expect(relativeTime(new Date(now - 3 * 3_600_000))).toBe("3h ago");
    expect(relativeTime(new Date(now - 2 * 86_400_000))).toBe("2d ago");
    expect(relativeTime(new Date(now - 14 * 86_400_000))).toBe("2w ago");
  });

  it("floors rather than rounds, so nothing reads as further away than it is", () => {
    const now = Date.now();
    expect(relativeTime(new Date(now - 90 * 60_000))).toBe("1h ago");
    expect(relativeTime(new Date(now - 59_000))).toBe("just now");
    expect(relativeTime(new Date(now - 23.5 * 3_600_000))).toBe("23h ago");
  });
});

describe("postedLabel", () => {
  it("names today and yesterday", () => {
    expect(postedLabel(new Date())).toBe("Today");
    expect(postedLabel(new Date(Date.now() - 86_400_000))).toBe("Yesterday");
  });

  it("counts days within the month", () => {
    expect(postedLabel(new Date(Date.now() - 5 * 86_400_000))).toBe(
      "5 days ago",
    );
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words", () => {
    expect(initials("Amara Ilunga")).toBe("AI");
    expect(initials("Amara Sofia Ilunga")).toBe("AS");
  });

  it("handles a single name and stray whitespace", () => {
    expect(initials("Amara")).toBe("A");
    expect(initials("  Amara   Ilunga  ")).toBe("AI");
  });
});

describe("humanizeEnum", () => {
  it("turns a database enum into a readable label", () => {
    expect(humanizeEnum("FULL_TIME")).toBe("Full time");
    expect(humanizeEnum("REMOTE")).toBe("Remote");
    expect(humanizeEnum("CONVERSATIONAL")).toBe("Conversational");
  });
});
