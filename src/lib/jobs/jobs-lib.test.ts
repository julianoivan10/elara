import { describe, expect, it } from "vitest";

import {
  blocksToText,
  decodeEntities,
  htmlToBlocks,
  textToBlocks,
} from "@/lib/jobs/html-text";
import {
  annualize,
  extractSections,
  inferSeniority,
  jobFingerprint,
  mapEmploymentType,
  mapLocationType,
  normalizeJob,
  safeHttpUrl,
  splitLocations,
} from "@/lib/jobs/normalize";
import { canonicalSkill, extractSkills } from "@/lib/jobs/skills";
import { planSync, type ExistingJob } from "@/lib/jobs/sync-plan";
import { boilerplateKeys, refineWithBoilerplate } from "@/lib/jobs/boilerplate";
import type { NormalizedJob, RawJob } from "@/lib/jobs/types";

const raw = (over: Partial<RawJob> = {}): RawJob => ({
  externalId: "e1",
  title: "Frontend Engineer",
  company: "Acme",
  locations: ["Jakarta, Indonesia"],
  descriptionHtml: "<p>Build things with React and TypeScript.</p>",
  applyUrl: "https://jobs.example.com/1/apply",
  ...over,
});

describe("htmlToBlocks", () => {
  it("keeps headings, paragraphs and lists; drops markup", () => {
    const blocks = htmlToBlocks(
      "<h3>About</h3><p>We <em>build</em> tools.</p><p><strong>What you'll do:</strong></p><ul><li>Ship <b>UI</b></li><li>Review code</li></ul>",
    );
    expect(blocks).toEqual([
      { type: "heading", text: "About" },
      { type: "paragraph", text: "We build tools." },
      { type: "heading", text: "What you'll do" },
      { type: "list", items: ["Ship UI", "Review code"] },
    ]);
  });

  it("unescapes Greenhouse's HTML-escaped content once", () => {
    expect(htmlToBlocks("&lt;p&gt;Tom &amp;amp; Jerry&lt;/p&gt;")).toEqual([
      { type: "paragraph", text: "Tom & Jerry" },
    ]);
  });

  it("never carries script, style or event handlers into the text", () => {
    const text = blocksToText(
      htmlToBlocks(
        '<p onclick="steal()">Hi</p><script>alert(1)</script><style>p{}</style><img src=x onerror=alert(1)><iframe src="evil"></iframe>',
      ),
    );
    expect(text).toBe("Hi");
  });

  it("decodes numeric entities but refuses control characters", () => {
    expect(decodeEntities("caf&#233; &#x2014; &#7;x")).toBe("café —  x");
  });

  it("round-trips through the stored text format", () => {
    const blocks = htmlToBlocks(
      "<h2>Role</h2><p>Text.</p><ul><li>a</li><li>b</li></ul>",
    );
    expect(textToBlocks(blocksToText(blocks))).toEqual(blocks);
  });
});

describe("field mapping", () => {
  it("maps workplace from the provider, else only from the posting's words", () => {
    expect(mapLocationType("OnSite", [], "")).toBe("ONSITE");
    expect(mapLocationType("hybrid", [], "")).toBe("HYBRID");
    expect(mapLocationType(null, ["Remote, Bangalore"], "")).toBe("REMOTE");
    expect(mapLocationType(null, ["Singapore"], "Engineer")).toBeNull();
  });

  it("maps contract types and leaves unknowns null", () => {
    expect(mapEmploymentType("FullTime")).toBe("FULL_TIME");
    expect(mapEmploymentType("Permanent")).toBe("FULL_TIME");
    expect(mapEmploymentType("Intern")).toBe("INTERNSHIP");
    expect(mapEmploymentType("Fixed-Term")).toBe("CONTRACT");
    expect(mapEmploymentType("part_time")).toBe("PART_TIME");
    expect(mapEmploymentType("")).toBeNull();
    expect(mapEmploymentType("Something else")).toBeNull();
  });

  it("infers seniority from the title only", () => {
    expect(inferSeniority("Senior Backend Engineer")).toBe("SENIOR");
    expect(inferSeniority("Staff Engineer")).toBe("LEAD");
    expect(inferSeniority("Senior / Staff Fullstack Engineer")).toBe("SENIOR");
    expect(inferSeniority("Senior Staff Engineer")).toBe("LEAD");
    expect(inferSeniority("Software Engineering Intern")).toBe("INTERNSHIP");
    expect(inferSeniority("Account Manager")).toBeNull();
    expect(inferSeniority("Product Designer")).toBeNull();
  });

  it("splits locations on bullets, semicolons and 'or', never on commas", () => {
    expect(splitLocations("San Francisco, CA; Chicago, IL")).toEqual([
      "San Francisco, CA",
      "Chicago, IL",
    ]);
    expect(splitLocations("Dublin or Berlin")).toEqual(["Dublin", "Berlin"]);
    expect(splitLocations("A • B")).toEqual(["A", "B"]);
  });

  it("annualises hourly and monthly pay", () => {
    expect(annualize(50, "HOUR")).toBe(104000);
    expect(annualize(10000, "MONTH")).toBe(120000);
    expect(annualize(null, "YEAR")).toBeNull();
  });

  it("accepts only http(s) links", () => {
    expect(safeHttpUrl("https://jobs.example.com/a")).toBe(
      "https://jobs.example.com/a",
    );
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
  });
});

describe("extractSections", () => {
  it("files lists under the headings the posting used", () => {
    const sections = extractSections(
      htmlToBlocks(
        "<h3>What you'll do</h3><ul><li>Ship</li></ul><h3>What we're looking for</h3><ul><li>3 years of React</li></ul><h3>Benefits</h3><ul><li>Health</li></ul><h3>Our values</h3><ul><li>Kindness</li></ul>",
      ),
    );
    expect(sections).toEqual({
      responsibilities: ["Ship"],
      requirements: ["3 years of React"],
      benefits: ["Health"],
    });
  });
});

describe("skills", () => {
  it("finds only skills named in the text", () => {
    expect(
      extractSkills("We use React, TypeScript and PostgreSQL on AWS."),
    ).toEqual(
      expect.arrayContaining(["React", "TypeScript", "PostgreSQL", "AWS"]),
    );
    expect(extractSkills("A modern front-end role.")).toEqual([]);
  });

  it("does not mistake English words for languages", () => {
    expect(extractSkills("Go deep on hard problems.")).not.toContain("Go");
    expect(extractSkills("Languages such as Java, Go, or Python.")).toContain(
      "Go",
    );
    expect(extractSkills("written in Go")).toContain("Go");
    expect(extractSkills("We excel at swift delivery and spark joy.")).toEqual(
      [],
    );
    expect(extractSkills("improve the user experience")).not.toContain(
      "UX Design",
    );
    expect(extractSkills("backed by Salesforce Ventures")).not.toContain(
      "Salesforce",
    );
    expect(extractSkills("Java and JavaScript")).toEqual(
      expect.arrayContaining(["Java", "JavaScript"]),
    );
    expect(extractSkills("JavaScript only")).not.toContain("Java");
  });

  it("excludes the employer's own name", () => {
    expect(extractSkills("Design in Figma at Figma.", ["Figma"])).not.toContain(
      "Figma",
    );
  });

  it("canonicalises free-typed profile skills", () => {
    expect(canonicalSkill("postgres")).toBe("PostgreSQL");
    expect(canonicalSkill("NextJS")).toBe("Next.js");
    expect(canonicalSkill("react")).toBe("React");
    expect(canonicalSkill("k8s")).toBe("Kubernetes");
    expect(canonicalSkill("Underwater basket weaving")).toBe(
      "Underwater basket weaving",
    );
  });
});

describe("normalizeJob", () => {
  it("normalises without inventing missing facts", () => {
    const job = normalizeJob("greenhouse", raw());
    expect(job).toMatchObject({
      provider: "greenhouse",
      location: "Jakarta, Indonesia",
      locationSearch: "jakarta, indonesia",
      locationType: null,
      employmentType: null,
      seniority: null,
      salaryMin: null,
      salaryCurrency: null,
      postedAt: null,
      skills: ["TypeScript", "React"],
    });
  });

  it("says so when no location is given", () => {
    expect(normalizeJob("lever", raw({ locations: [] })).location).toBe(
      "Location not specified",
    );
  });

  it("fingerprints the same job the same way across sources", () => {
    expect(
      jobFingerprint("Acme Inc.", "Frontend Engineer", "Jakarta, Indonesia"),
    ).toBe(jobFingerprint("acme", "Frontend  engineer", "Jakarta"));
    expect(jobFingerprint("Acme", "Backend Engineer", "Jakarta")).not.toBe(
      jobFingerprint("Acme", "Frontend Engineer", "Jakarta"),
    );
  });

  it("hashes content deterministically", () => {
    expect(normalizeJob("ashby", raw()).contentHash).toBe(
      normalizeJob("ashby", raw()).contentHash,
    );
    expect(normalizeJob("ashby", raw()).contentHash).not.toBe(
      normalizeJob("ashby", raw({ title: "Backend Engineer" })).contentHash,
    );
  });
});

describe("planSync", () => {
  const job = (id: string, hash = `h-${id}`, expiresAt: Date | null = null) =>
    ({
      ...normalizeJob("lever", raw({ externalId: id })),
      contentHash: hash,
      expiresAt,
    }) as NormalizedJob;
  const existing = (
    id: string,
    over: Partial<ExistingJob> = {},
  ): ExistingJob => ({
    id: `db-${id}`,
    externalId: id,
    contentHash: `h-${id}`,
    isActive: true,
    inactiveReason: null,
    ...over,
  });
  const now = new Date("2026-09-22T00:00:00Z");

  it("creates, updates, touches and retires", () => {
    const plan = planSync({
      incoming: [job("new"), job("changed", "h-different"), job("same")],
      existing: [existing("changed"), existing("same"), existing("gone")],
      completeListing: true,
      now,
    });
    expect(plan.create.map((j) => j.externalId)).toEqual(["new"]);
    expect(plan.update.map((u) => u.id)).toEqual(["db-changed"]);
    expect(plan.touch).toEqual(["db-same"]);
    expect(plan.retire).toEqual(["db-gone"]);
  });

  it("never retires anything from a partial (aggregator) feed", () => {
    const plan = planSync({
      incoming: [],
      existing: [existing("gone")],
      completeListing: false,
      now,
    });
    expect(plan.retire).toEqual([]);
  });

  it("revives a listing that comes back, but not a retired duplicate", () => {
    const plan = planSync({
      incoming: [job("back"), job("dupe")],
      existing: [
        existing("back", { isActive: false, inactiveReason: "removed" }),
        existing("dupe", { isActive: false, inactiveReason: "duplicate" }),
      ],
      completeListing: true,
      now,
    });
    expect(plan.touch).toEqual(["db-back"]);
  });

  it("marks listings past their closing date as expired", () => {
    const plan = planSync({
      incoming: [job("old", "h-old", new Date("2020-01-01"))],
      existing: [],
      completeListing: true,
      now,
    });
    expect(plan.create).toHaveLength(1);
    expect(plan.expired.has("old")).toBe(true);
  });

  it("drops repeats within one feed", () => {
    const plan = planSync({
      incoming: [job("a"), job("a")],
      existing: [],
      completeListing: true,
      now,
    });
    expect(plan.create).toHaveLength(1);
    expect(plan.duplicatesInFeed).toBe(1);
  });
});

describe("boilerplate", () => {
  const intro =
    "<p>Acme runs its whole platform on Kubernetes and builds payments infrastructure for the world.</p>";
  const make = (i: number, body: string) =>
    normalizeJob(
      "ashby",
      raw({
        externalId: `b${i}`,
        title: `Role ${i}`,
        descriptionHtml: `${intro}${body}`,
      }),
    );

  it("finds blocks repeated across a board and takes skills from the rest", () => {
    const jobs = [
      make(
        1,
        "<p>You will build React interfaces for merchants across the region.</p>",
      ),
      make(
        2,
        "<p>You will run Kafka pipelines and write Python every day at work.</p>",
      ),
      make(
        3,
        "<p>You will own the design system in Figma and write CSS all day.</p>",
      ),
      make(
        4,
        "<p>You will manage partner relationships and grow revenue in the region.</p>",
      ),
    ];
    expect(boilerplateKeys(jobs).size).toBe(1);
    expect(jobs[0].skills).toContain("Kubernetes"); // before: the intro counted

    const refined = refineWithBoilerplate(jobs);
    expect(refined[0].skills).toEqual(["React"]);
    expect(refined[0].summary).toContain("React interfaces");
    expect(refined[3].skills).toEqual([]);
    expect(refined[0].contentHash).not.toBe(jobs[0].contentHash);
  });

  it("leaves small batches alone", () => {
    const jobs = [make(1, "<p>x</p>"), make(2, "<p>y</p>")];
    expect(refineWithBoilerplate(jobs)).toBe(jobs);
  });
});
