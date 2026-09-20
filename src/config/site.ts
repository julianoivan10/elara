/**
 * Product-level constants. Anything a copywriter or designer might want to
 * change lives here rather than being scattered through components.
 */
export const site = {
  name: "ELARA",
  wordmark: "elara",
  tagline: "A career workspace",
  description:
    "Keep your career profile, resumes, job search and applications in one place — and turn them into applications that are actually tailored.",
  url: "http://localhost:3000",
} as const;

/**
 * The recurring editorial motif: the five stages of the ELARA workflow.
 * Used on the landing page, in the workspace navigation and in empty states.
 */
export const stages = [
  {
    index: "01",
    key: "profile",
    label: "Profile",
    title: "Write your career down once",
    description:
      "Roles, education, projects and skills as structured records — not a document you keep re-typing.",
    href: "/profile",
  },
  {
    index: "02",
    key: "resume",
    label: "Resume",
    title: "Compose a resume from it",
    description:
      "Pick the sections that matter, choose a template, and see the page update as you type.",
    href: "/resume",
  },
  {
    index: "03",
    key: "jobs",
    label: "Opportunities",
    title: "Find roles worth your time",
    description:
      "Search and filter openings, keep the ones you want, and read them without the noise.",
    href: "/jobs",
  },
  {
    index: "04",
    key: "tailor",
    label: "Tailor",
    title: "Aim a resume at one role",
    description:
      "ELARA reads the posting, shows what it is asking for, and helps you sharpen your own wording.",
    href: "/jobs",
  },
  {
    index: "05",
    key: "applications",
    label: "Applications",
    title: "Know where everything stands",
    description:
      "Every application, its stage, its notes and what happens next — on one board.",
    href: "/applications",
  },
] as const;

export type Stage = (typeof stages)[number];
