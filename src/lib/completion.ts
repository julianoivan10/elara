/**
 * Career profile completion.
 *
 * Pure domain logic, deliberately kept out of the server-only CareerService so
 * it can be reasoned about and tested on its own — it decides what advice a
 * person is given about their own profile.
 */

/** The shape completion needs. Structural, so it is not tied to Prisma. */
export type CompletionInput = {
  fullName: string;
  headline: string | null;
  summary: string | null;
  location: string | null;
  links: unknown[];
  experience: { highlights: string[] }[];
  education: unknown[];
  projects: unknown[];
  skills: unknown[];
  languages: unknown[];
  certifications: unknown[];
};

export type CompletionItem = {
  key: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
  weight: number;
};

export type Completion = {
  percent: number;
  items: CompletionItem[];
  next: CompletionItem[];
};

/**
 * Profile completion as a weighted checklist rather than a count of filled
 * fields. The weights say what actually makes a resume usable: one real role
 * with results written down matters more than a phone number.
 */
export function computeCompletion(profile: CompletionInput | null): Completion {
  const has = (value: string | null | undefined) =>
    Boolean(value && value.trim().length > 0);

  const experienceWithHighlights =
    profile?.experience.some((role) => role.highlights.length > 0) ?? false;

  const items: CompletionItem[] = [
    {
      key: "name",
      label: "Your name",
      hint: "Heads every resume you export.",
      href: "/profile",
      weight: 4,
      done: has(profile?.fullName),
    },
    {
      key: "headline",
      label: "A headline",
      hint: "One line: what you do, and what you do it on.",
      href: "/profile",
      weight: 10,
      done: has(profile?.headline),
    },
    {
      key: "summary",
      label: "A summary",
      hint: "Three or four sentences a reader can skim first.",
      href: "/profile",
      weight: 12,
      done: has(profile?.summary),
    },
    {
      key: "location",
      label: "Where you are",
      hint: "Needed to match you against location filters.",
      href: "/profile",
      weight: 4,
      done: has(profile?.location),
    },
    {
      key: "links",
      label: "A link or two",
      hint: "A portfolio, a repository, or anything you want read.",
      href: "/profile",
      weight: 5,
      done: (profile?.links.length ?? 0) > 0,
    },
    {
      key: "experience",
      label: "At least one role",
      hint: "Work, an internship or volunteering all count.",
      href: "/profile",
      weight: 17,
      done: (profile?.experience.length ?? 0) > 0,
    },
    {
      key: "highlights",
      label: "Results under a role",
      hint: "What changed because you were there — not the job description.",
      href: "/profile",
      weight: 10,
      done: experienceWithHighlights,
    },
    {
      key: "education",
      label: "Education",
      hint: "A degree, a diploma or a course.",
      href: "/profile",
      weight: 8,
      done: (profile?.education.length ?? 0) > 0,
    },
    {
      key: "projects",
      label: "A project",
      hint: "Often the strongest evidence early in a career.",
      href: "/projects",
      weight: 12,
      done: (profile?.projects.length ?? 0) > 0,
    },
    {
      key: "skills",
      label: "Five or more skills",
      hint: "What job filters and keyword scans look for.",
      href: "/profile",
      weight: 12,
      done: (profile?.skills.length ?? 0) >= 5,
    },
    {
      key: "extras",
      label: "Languages or certifications",
      hint: "Small sections that fill out a short resume.",
      href: "/profile",
      weight: 6,
      done:
        (profile?.languages.length ?? 0) > 0 ||
        (profile?.certifications.length ?? 0) > 0,
    },
  ];

  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const earned = items.reduce(
    (sum, item) => sum + (item.done ? item.weight : 0),
    0,
  );

  return {
    percent: Math.round((earned / total) * 100),
    items,
    // The heaviest unfinished items first: the advice should be worth taking.
    next: items
      .filter((item) => !item.done)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3),
  };
}
