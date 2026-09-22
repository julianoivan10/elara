import { z } from "zod";

/**
 * Career profile contracts.
 *
 * Forms post plain strings, so the transforms here are where "2023-03" becomes
 * a Date and a textarea of lines becomes a string array. Doing it once, at the
 * boundary, keeps the rest of the product working with real types.
 */

/** `<input type="month">` gives "YYYY-MM". Empty means "not stated". */
export const monthValue = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .refine((value) => value === null || /^\d{4}-\d{2}$/.test(value), {
    message: "Use a month and year.",
  })
  .transform((value) =>
    value === null ? null : new Date(`${value}-01T00:00:00Z`),
  )
  .refine((value) => value === null || !Number.isNaN(value.getTime()), {
    message: "That date is not valid.",
  });

/** Format a stored date back into a month input's value. */
export function toMonthValue(date: Date | null | undefined) {
  if (!date) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** One bullet per line, blank lines dropped. */
export const lines = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split("\n")
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .filter((line) => line.length > 0)
      .slice(0, 12),
  );

/** Comma-separated tags. */
export const tags = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 30),
  );

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine((value) => value === null || /^https?:\/\/.+\..+/.test(value), {
    message: "Include the full address, starting with https://",
  });

/* ------------------------------------------------------------------ basics */

export const basicsSchema = z.object({
  fullName: z.string().trim().min(1, "Your name is needed.").max(80),
  headline: optionalText(120),
  summary: optionalText(1200),
  location: optionalText(120),
  phone: optionalText(40),
  website: optionalUrl,
  openToWork: z.coerce.boolean().default(false),
});

/* ------------------------------------------------------------------- links */

export const linkSchema = z.object({
  id: z.string().optional(),
  label: z.string().trim().min(1, "Give the link a label.").max(40),
  url: z
    .string()
    .trim()
    .min(1, "Add the address.")
    .refine((value) => /^https?:\/\/.+\..+/.test(value), {
      message: "Include the full address, starting with https://",
    }),
});

/* -------------------------------------------------------------- experience */

export const experienceSchema = z
  .object({
    id: z.string().optional(),
    role: z.string().trim().min(1, "What was the role called?").max(120),
    company: z.string().trim().min(1, "Which organisation?").max(120),
    employmentType: z
      .enum([
        "FULL_TIME",
        "PART_TIME",
        "CONTRACT",
        "INTERNSHIP",
        "FREELANCE",
        "VOLUNTEER",
      ])
      .default("FULL_TIME"),
    locationType: z.enum(["ONSITE", "HYBRID", "REMOTE"]).default("ONSITE"),
    location: optionalText(120),
    startDate: monthValue,
    endDate: monthValue,
    current: z.coerce.boolean().default(false),
    summary: optionalText(600),
    highlights: lines,
    skills: tags,
  })
  .refine(
    (data) =>
      data.current ||
      !data.startDate ||
      !data.endDate ||
      data.endDate >= data.startDate,
    { message: "The end date comes before the start date.", path: ["endDate"] },
  );

/* --------------------------------------------------------------- education */

export const educationSchema = z
  .object({
    id: z.string().optional(),
    school: z.string().trim().min(1, "Which institution?").max(140),
    degree: optionalText(80),
    field: optionalText(120),
    location: optionalText(120),
    startDate: monthValue,
    endDate: monthValue,
    current: z.coerce.boolean().default(false),
    grade: optionalText(60),
    description: optionalText(600),
  })
  .refine(
    (data) =>
      data.current ||
      !data.startDate ||
      !data.endDate ||
      data.endDate >= data.startDate,
    { message: "The end date comes before the start date.", path: ["endDate"] },
  );

/* ---------------------------------------------------------------- projects */

export const projectSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, "Give the project a name.").max(120),
    role: optionalText(120),
    description: optionalText(800),
    highlights: lines,
    technologies: tags,
    url: optionalUrl,
    repoUrl: optionalUrl,
    startDate: monthValue,
    endDate: monthValue,
    current: z.coerce.boolean().default(false),
    featured: z.coerce.boolean().default(false),
  })
  .refine(
    (data) =>
      data.current ||
      !data.startDate ||
      !data.endDate ||
      data.endDate >= data.startDate,
    { message: "The end date comes before the start date.", path: ["endDate"] },
  );

/* ------------------------------------------------------------------ skills */

export const skillSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name the skill.").max(60),
  category: optionalText(40),
  level: z
    .enum(["FAMILIAR", "PROFICIENT", "ADVANCED", "EXPERT"])
    .default("PROFICIENT"),
});

/** The quick-add field on the profile: "React, TypeScript, Figma". */
export const bulkSkillsSchema = z.object({
  names: tags,
  category: optionalText(40),
});

/* ---------------------------------------------------- certifications, etc. */

export const certificationSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name the certification.").max(140),
  issuer: optionalText(120),
  issueDate: monthValue,
  expiryDate: monthValue,
  credentialId: optionalText(80),
  url: optionalUrl,
});

export const languageSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Name the language.").max(60),
  proficiency: z
    .enum(["BASIC", "CONVERSATIONAL", "PROFESSIONAL", "FLUENT", "NATIVE"])
    .default("PROFESSIONAL"),
});

export const achievementSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "What was it?").max(140),
  description: optionalText(600),
  date: monthValue,
});

/* ------------------------------------------------------------- reordering */

export const reorderSchema = z.object({
  id: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

/* ------------------------------------------------------- job preferences */

const WORKPLACES = ["ONSITE", "HYBRID", "REMOTE"] as const;
const CONTRACTS = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "FREELANCE",
  "VOLUNTEER",
] as const;

/**
 * What the person is looking for. Every field is optional; an empty list
 * means "no preference", so nothing is filtered out on its account.
 */
export const preferencesSchema = z
  .object({
    targetRoles: tags.transform((v) =>
      v.map((r) => r.slice(0, 80)).slice(0, 8),
    ),
    preferredLocations: tags.transform((v) =>
      v.map((l) => l.slice(0, 80)).slice(0, 8),
    ),
    preferredLocationTypes: z.array(z.enum(WORKPLACES)).max(3).default([]),
    preferredEmploymentTypes: z.array(z.enum(CONTRACTS)).max(6).default([]),
    desiredSalaryMin: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? Number(v.replace(/[^\d]/g, "")) || null : null))
      .refine((v) => v === null || (v > 0 && v <= 100_000_000), {
        message: "Enter a yearly amount.",
      }),
    desiredSalaryCurrency: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.toUpperCase() : null))
      .refine((v) => v === null || /^[A-Z]{3}$/.test(v), {
        message: "Use a three-letter currency code, like SGD.",
      }),
  })
  .refine((v) => !v.desiredSalaryMin || v.desiredSalaryCurrency, {
    message: "Say which currency that amount is in.",
    path: ["desiredSalaryCurrency"],
  });
