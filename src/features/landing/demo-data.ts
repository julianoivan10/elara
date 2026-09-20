/**
 * Demo content for the marketing page only.
 *
 * These are invented people and companies written to read like real records —
 * never "John Doe" or lorem ipsum, because the landing page is showing the
 * product's own typography and information hierarchy doing its job. Nothing
 * here touches the database; seeded demo jobs live in prisma/seed.ts.
 */

export const demoPerson = {
  name: "Amara Ilunga",
  headline: "Front-end engineer — design systems",
  location: "Lisbon, PT",
  email: "amara.ilunga@hey.com",
  site: "amara.build",
} as const;

export const demoExperience = [
  {
    role: "Front-end engineer",
    company: "Norwind",
    period: "2023 — Present",
    bullets: [
      "Rebuilt the component library used by four product teams, cutting UI defects at review.",
      "Introduced visual regression checks to the release pipeline.",
    ],
  },
  {
    role: "Junior developer",
    company: "Caldera Studio",
    period: "2021 — 2023",
    bullets: [
      "Shipped the booking flow for a 40-venue client across web and tablet.",
    ],
  },
] as const;

export const demoProjects = [
  {
    name: "Tideline",
    role: "Design and build",
    description:
      "An offline-first tide and swell reader for the Atlantic coast.",
  },
] as const;

export const demoSkills = [
  "TypeScript",
  "React",
  "Design systems",
  "Accessibility",
  "Testing",
  "Figma",
] as const;

/** The AI section: a real "before" line and the sharpened wording beside it. */
export const demoBullet = {
  before:
    "Was responsible for the component library and helped other teams use it.",
  after:
    "Rebuilt the shared component library adopted by four product teams, and wrote the migration guide they shipped against.",
  notes: [
    "Kept every fact you wrote",
    "Named the artefact, not the responsibility",
    "Left the number blank — ELARA will not invent one",
  ],
} as const;

/** The jobs section: four openings with ELARA's own hierarchy. */
export const demoJobs = [
  {
    title: "Front-end engineer",
    company: "Norwind",
    location: "Lisbon",
    locationType: "Hybrid",
    type: "Full time",
    salary: "€48k–€62k",
    posted: "2 days ago",
    skills: ["TypeScript", "React", "Design systems"],
    match: 92,
  },
  {
    title: "Product engineer, web",
    company: "Halden Labs",
    location: "Remote — EU",
    locationType: "Remote",
    type: "Full time",
    salary: "€55k–€70k",
    posted: "4 days ago",
    skills: ["React", "Node", "Postgres"],
    match: 78,
  },
  {
    title: "UI engineer (design systems)",
    company: "Marrow",
    location: "Porto",
    locationType: "On-site",
    type: "Contract",
    salary: "€300/day",
    posted: "1 week ago",
    skills: ["Accessibility", "CSS", "Storybook"],
    match: 71,
  },
] as const;

/** The tracker section: a board mid-search. */
export const demoApplications = [
  {
    status: "Applied",
    company: "Norwind",
    role: "Front-end engineer",
    when: "3d",
  },
  {
    status: "Screening",
    company: "Halden Labs",
    role: "Product engineer",
    when: "1d",
  },
  {
    status: "Interview",
    company: "Marrow",
    role: "UI engineer",
    when: "Thu 14:00",
  },
  {
    status: "Offer",
    company: "Pell & Co",
    role: "Front-end developer",
    when: "2d",
  },
] as const;
