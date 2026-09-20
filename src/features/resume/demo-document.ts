import type { ResumeDocument } from "@/features/resume/document";

/**
 * A complete, invented resume used by the landing page's template showcase.
 *
 * It goes through the same ResumeDocument type the editor produces, so the
 * templates on the marketing page are the actual templates — not a mock-up of
 * them. Kept out of the database: nothing here is user data.
 */
export const demoResume: ResumeDocument = {
  header: {
    name: "Amara Ilunga",
    headline: "Front-end engineer — design systems",
    location: "Lisbon, Portugal",
    email: "amara.ilunga@hey.com",
    phone: "+351 912 004 118",
    website: "amara.build",
    links: [
      { label: "GitHub", url: "https://github.com/amarailunga" },
      { label: "Writing", url: "https://amara.build/notes" },
    ],
  },
  sections: [
    {
      kind: "SUMMARY",
      title: "Summary",
      body: "Front-end engineer with four years building and maintaining shared interface systems. Most comfortable at the seam between design and engineering — turning an agreed visual language into components other teams can move quickly with, and keeping them accessible as they grow.",
    },
    {
      kind: "EXPERIENCE",
      title: "Experience",
      items: [
        {
          id: "exp-norwind",
          role: "Front-end engineer",
          company: "Norwind",
          location: "Lisbon (hybrid)",
          period: "Mar 2023 — Present",
          summary: null,
          highlights: [
            "Rebuilt the shared component library adopted by four product teams, and wrote the migration guide they shipped against.",
            "Added visual regression checks to the release pipeline, moving UI review from screenshots in tickets to a gate on every pull request.",
            "Took the marketing site to WCAG 2.2 AA, including a keyboard-navigable booking flow.",
          ],
        },
        {
          id: "exp-caldera",
          role: "Junior developer",
          company: "Caldera Studio",
          location: "Porto",
          period: "Sep 2021 — Feb 2023",
          summary: null,
          highlights: [
            "Shipped the booking flow used across 40 venue clients on web and tablet.",
            "Maintained the studio's internal React starter and its documentation.",
          ],
        },
      ],
    },
    {
      kind: "PROJECTS",
      title: "Projects",
      items: [
        {
          id: "proj-tideline",
          name: "Tideline",
          role: "Design and build",
          period: "2024",
          description:
            "An offline-first tide and swell reader for the Atlantic coast, built as a progressive web app.",
          highlights: [
            "Caches a fortnight of forecast data so the app stays useful without signal.",
          ],
          technologies: ["TypeScript", "React", "IndexedDB", "Workbox"],
          url: "https://amara.build/tideline",
        },
      ],
    },
    {
      kind: "EDUCATION",
      title: "Education",
      items: [
        {
          id: "edu-porto",
          school: "University of Porto",
          qualification: "BSc Informatics Engineering",
          location: "Porto",
          period: "2018 — 2021",
          detail: null,
        },
      ],
    },
    {
      kind: "SKILLS",
      title: "Skills",
      groups: [
        {
          label: "Languages",
          items: ["TypeScript", "JavaScript", "HTML", "CSS"],
        },
        {
          label: "Practice",
          items: [
            "Design systems",
            "Accessibility (WCAG 2.2)",
            "Testing Library",
            "Playwright",
          ],
        },
        { label: "Tools", items: ["React", "Next.js", "Figma", "Storybook"] },
      ],
    },
    {
      kind: "LANGUAGES",
      title: "Languages",
      items: [
        { id: "lang-pt", primary: "Portuguese", meta: "Native" },
        { id: "lang-en", primary: "English", meta: "Fluent" },
        { id: "lang-fr", primary: "French", meta: "Conversational" },
      ],
    },
  ],
};
