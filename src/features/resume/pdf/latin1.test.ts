import { describe, expect, it } from "vitest";

import { latin1, toLatin1Document } from "@/features/resume/pdf/latin1";
import type { ResumeDocument } from "@/features/resume/document";

/**
 * The PDF's core fonts silently *drop* characters above U+00FF rather than
 * failing, so an unfolded em dash just vanishes from the exported page. These
 * tests guard the fold that prevents it.
 */
describe("latin1", () => {
  it("folds dashes to a hyphen", () => {
    expect(latin1("Mar 2023 — Present")).toBe("Mar 2023 - Present");
    expect(latin1("2021 – 2023")).toBe("2021 - 2023");
  });

  it("folds curly quotes and ellipses", () => {
    expect(latin1("the studio’s starter")).toBe("the studio's starter");
    expect(latin1("“quoted”")).toBe('"quoted"');
    expect(latin1("and so on…")).toBe("and so on...");
  });

  it("folds bullets and arrows", () => {
    expect(latin1("• a point")).toBe("- a point");
    expect(latin1("Applied → Interview")).toBe("Applied -> Interview");
  });

  it("normalises exotic spaces and strips zero-width characters", () => {
    expect(latin1("a b")).toBe("a b");
    expect(latin1("a​b")).toBe("ab");
  });

  it("leaves characters the core fonts can render", () => {
    // The middle dot and accented Latin are inside Latin-1 and must survive.
    expect(latin1("Lisbon · Hybrid")).toBe("Lisbon · Hybrid");
    expect(latin1("Universidade do Minho — João")).toBe(
      "Universidade do Minho - João",
    );
    expect(latin1("€48k")).toBe("€48k");
  });

  it("leaves plain text untouched", () => {
    expect(latin1("Front-end engineer")).toBe("Front-end engineer");
  });
});

describe("toLatin1Document", () => {
  const doc: ResumeDocument = {
    header: {
      name: "Amara Ilunga",
      headline: "Front-end engineer — design systems",
      location: "Lisbon",
      email: "amara@example.com",
      phone: null,
      website: null,
      links: [{ label: "Writing — notes", url: "https://amara.build/notes—x" }],
    },
    sections: [
      {
        kind: "SUMMARY",
        title: "Summary",
        body: "An engineer — and an editor.",
      },
      {
        kind: "EXPERIENCE",
        title: "Experience",
        items: [
          {
            id: "e1",
            role: "Engineer",
            company: "Norwind",
            location: null,
            period: "2023 — Present",
            summary: null,
            highlights: ["• Shipped the thing — twice"],
          },
        ],
      },
      {
        kind: "SKILLS",
        title: "Skills",
        groups: [{ label: "Tools — core", items: ["React — 19"] }],
      },
    ],
  };

  const folded = toLatin1Document(doc);

  it("folds every string in the document, at every depth", () => {
    expect(folded.header.headline).toBe("Front-end engineer - design systems");
    expect(folded.header.links[0].label).toBe("Writing - notes");

    const summary = folded.sections[0];
    if (summary.kind !== "SUMMARY") throw new Error("wrong kind");
    expect(summary.body).toBe("An engineer - and an editor.");

    const experience = folded.sections[1];
    if (experience.kind !== "EXPERIENCE") throw new Error("wrong kind");
    expect(experience.items[0].period).toBe("2023 - Present");
    expect(experience.items[0].highlights[0]).toBe(
      "- Shipped the thing - twice",
    );

    const skills = folded.sections[2];
    if (skills.kind !== "SKILLS") throw new Error("wrong kind");
    expect(skills.groups[0].label).toBe("Tools - core");
    expect(skills.groups[0].items[0]).toBe("React - 19");
  });

  it("leaves link targets verbatim, because a URL must not be rewritten", () => {
    expect(folded.header.links[0].url).toBe("https://amara.build/notes—x");
  });

  it("does not mutate the document it was given", () => {
    expect(doc.header.headline).toBe("Front-end engineer — design systems");
  });

  it("preserves nulls rather than turning them into empty strings", () => {
    expect(folded.header.phone).toBeNull();
    expect(folded.header.website).toBeNull();
  });
});
