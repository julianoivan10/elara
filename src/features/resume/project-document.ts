import { z } from "zod";

import { dateRange, humanizeEnum } from "@/lib/format";
import type {
  ResumeDocument,
  ResumeSectionData,
} from "@/features/resume/document";

/**
 * The profile → resume projection.
 *
 * Deliberately pure and free of any server import, because it runs in two
 * places: on the server when exporting a PDF, and in the browser while the
 * editor is being used, so the preview updates as you type without a round
 * trip. One implementation means the preview cannot drift from the export.
 */

/* ---------------------------------------------------------------- config */

const overrideSchema = z.object({
  summary: z.string().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

export const configSchema = z.object({
  /**
   * Opt-*out*, not opt-in: a resume records what to leave out, so anything
   * added to the profile later appears in existing resumes rather than
   * silently going missing.
   */
  excludedIds: z.array(z.string()).default([]),
  /** Resume-specific wording. Tailoring writes here, never to the profile. */
  overrides: z.record(z.string(), overrideSchema).default({}),
  text: z.string().optional(),
  groupSkills: z.boolean().default(true),
  showPhone: z.boolean().default(true),
  showEmail: z.boolean().default(true),
  showLocation: z.boolean().default(true),
  showWebsite: z.boolean().default(true),
  maxHighlights: z.number().int().min(1).max(12).optional(),
});

export type SectionConfig = z.infer<typeof configSchema>;

/** Stored JSON is never trusted: parse it, falling back to defaults. */
export function parseConfig(value: unknown): SectionConfig {
  const result = configSchema.safeParse(value ?? {});
  return result.success ? result.data : configSchema.parse({});
}

/* ------------------------------------------------------- input contracts */

export type ProjectionSection = {
  id: string;
  kind: string;
  title: string;
  visible: boolean;
  sortIndex: number;
  config: unknown;
};

export type ProjectionProfile = {
  fullName: string;
  headline: string | null;
  summary: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  links: { id: string; label: string; url: string }[];
  experience: {
    id: string;
    role: string;
    company: string;
    location: string | null;
    locationType: string;
    startDate: Date | null;
    endDate: Date | null;
    current: boolean;
    summary: string | null;
    highlights: string[];
  }[];
  education: {
    id: string;
    school: string;
    degree: string | null;
    field: string | null;
    location: string | null;
    startDate: Date | null;
    endDate: Date | null;
    current: boolean;
    grade: string | null;
    description: string | null;
  }[];
  projects: {
    id: string;
    name: string;
    role: string | null;
    description: string | null;
    highlights: string[];
    technologies: string[];
    url: string | null;
    startDate: Date | null;
    endDate: Date | null;
    current: boolean;
  }[];
  skills: { id: string; name: string; category: string | null }[];
  certifications: {
    id: string;
    name: string;
    issuer: string | null;
    issueDate: Date | null;
    expiryDate: Date | null;
  }[];
  languages: { id: string; name: string; proficiency: string }[];
  achievements: {
    id: string;
    title: string;
    description: string | null;
    date: Date | null;
  }[];
};

/* ------------------------------------------------------------ projection */

export function projectDocument(
  sections: ProjectionSection[],
  profile: ProjectionProfile | null,
): ResumeDocument {
  const ordered = [...sections].sort((a, b) => a.sortIndex - b.sortIndex);

  const headerSection = ordered.find((section) => section.kind === "HEADER");
  const headerConfig = parseConfig(headerSection?.config);

  const header: ResumeDocument["header"] = {
    name: profile?.fullName ?? "",
    headline: profile?.headline ?? null,
    location: headerConfig.showLocation ? (profile?.location ?? null) : null,
    email: headerConfig.showEmail ? (profile?.email ?? null) : null,
    phone: headerConfig.showPhone ? (profile?.phone ?? null) : null,
    website: headerConfig.showWebsite ? (profile?.website ?? null) : null,
    links: (profile?.links ?? []).map((link) => ({
      label: link.label,
      url: link.url,
    })),
  };

  const result: ResumeSectionData[] = [];

  for (const section of ordered) {
    if (!section.visible || section.kind === "HEADER") continue;

    const config = parseConfig(section.config);
    const skip = new Set(config.excludedIds);
    const cap = (items: string[]) =>
      config.maxHighlights ? items.slice(0, config.maxHighlights) : items;

    switch (section.kind) {
      case "SUMMARY": {
        const body = (config.text ?? profile?.summary ?? "").trim();
        if (body) result.push({ kind: "SUMMARY", title: section.title, body });
        break;
      }

      case "EXPERIENCE": {
        const items = (profile?.experience ?? [])
          .filter((role) => !skip.has(role.id))
          .map((role) => {
            const override = config.overrides[role.id];
            return {
              id: role.id,
              role: role.role,
              company: role.company,
              location:
                [
                  role.location,
                  role.locationType !== "ONSITE"
                    ? humanizeEnum(role.locationType)
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || null,
              period: dateRange(role.startDate, role.endDate, role.current),
              summary: override?.summary ?? role.summary ?? null,
              highlights: cap(override?.highlights ?? role.highlights),
            };
          });
        if (items.length)
          result.push({ kind: "EXPERIENCE", title: section.title, items });
        break;
      }

      case "EDUCATION": {
        const items = (profile?.education ?? [])
          .filter((entry) => !skip.has(entry.id))
          .map((entry) => ({
            id: entry.id,
            school: entry.school,
            qualification:
              [entry.degree, entry.field].filter(Boolean).join(", ") || null,
            location: entry.location,
            period: dateRange(entry.startDate, entry.endDate, entry.current),
            detail:
              config.overrides[entry.id]?.description ??
              ([entry.grade, entry.description].filter(Boolean).join(" · ") ||
                null),
          }));
        if (items.length)
          result.push({ kind: "EDUCATION", title: section.title, items });
        break;
      }

      case "PROJECTS": {
        const items = (profile?.projects ?? [])
          .filter((project) => !skip.has(project.id))
          .map((project) => {
            const override = config.overrides[project.id];
            return {
              id: project.id,
              name: project.name,
              role: project.role,
              period: dateRange(
                project.startDate,
                project.endDate,
                project.current,
              ),
              description: override?.description ?? project.description ?? null,
              highlights: cap(override?.highlights ?? project.highlights),
              technologies: project.technologies,
              url: project.url,
            };
          });
        if (items.length)
          result.push({ kind: "PROJECTS", title: section.title, items });
        break;
      }

      case "SKILLS": {
        const skills = (profile?.skills ?? []).filter((s) => !skip.has(s.id));
        if (!skills.length) break;

        if (config.groupSkills) {
          const groups = new Map<string, string[]>();
          for (const skill of skills) {
            const key = skill.category?.trim() || "Other";
            groups.set(key, [...(groups.get(key) ?? []), skill.name]);
          }
          result.push({
            kind: "SKILLS",
            title: section.title,
            groups: [...groups.entries()].map(([label, items]) => ({
              // A lone "Other" bucket is noise; drop the label.
              label: groups.size === 1 && label === "Other" ? null : label,
              items,
            })),
          });
        } else {
          result.push({
            kind: "SKILLS",
            title: section.title,
            groups: [{ label: null, items: skills.map((s) => s.name) }],
          });
        }
        break;
      }

      case "CERTIFICATIONS": {
        const items = (profile?.certifications ?? [])
          .filter((entry) => !skip.has(entry.id))
          .map((entry) => ({
            id: entry.id,
            primary: entry.name,
            secondary: entry.issuer,
            meta: dateRange(entry.issueDate, entry.expiryDate, false),
          }));
        if (items.length)
          result.push({ kind: "CERTIFICATIONS", title: section.title, items });
        break;
      }

      case "LANGUAGES": {
        const items = (profile?.languages ?? [])
          .filter((entry) => !skip.has(entry.id))
          .map((entry) => ({
            id: entry.id,
            primary: entry.name,
            meta: humanizeEnum(entry.proficiency),
          }));
        if (items.length)
          result.push({ kind: "LANGUAGES", title: section.title, items });
        break;
      }

      case "ACHIEVEMENTS": {
        const items = (profile?.achievements ?? [])
          .filter((entry) => !skip.has(entry.id))
          .map((entry) => ({
            id: entry.id,
            primary: entry.title,
            secondary: entry.description,
            meta: entry.date ? dateRange(entry.date, entry.date, false) : null,
          }));
        if (items.length)
          result.push({ kind: "ACHIEVEMENTS", title: section.title, items });
        break;
      }

      case "LINKS": {
        const items = (profile?.links ?? [])
          .filter((link) => !skip.has(link.id))
          .map((link) => ({ label: link.label, url: link.url }));
        if (items.length)
          result.push({ kind: "LINKS", title: section.title, items });
        break;
      }

      default:
        break;
    }
  }

  return { header, sections: result };
}

/** Narrow a full Prisma profile down to what the projection needs. */
export function toProjectionProfile(profile: {
  fullName: string;
  headline: string | null;
  summary: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  user: { email: string };
  links: { id: string; label: string; url: string }[];
  experience: ProjectionProfile["experience"];
  education: ProjectionProfile["education"];
  projects: ProjectionProfile["projects"];
  skills: { id: string; name: string; category: string | null }[];
  certifications: ProjectionProfile["certifications"];
  languages: { id: string; name: string; proficiency: string }[];
  achievements: ProjectionProfile["achievements"];
}): ProjectionProfile {
  return {
    fullName: profile.fullName,
    headline: profile.headline,
    summary: profile.summary,
    location: profile.location,
    phone: profile.phone,
    website: profile.website,
    email: profile.user.email,
    links: profile.links.map((l) => ({ id: l.id, label: l.label, url: l.url })),
    experience: profile.experience.map((e) => ({
      id: e.id,
      role: e.role,
      company: e.company,
      location: e.location,
      locationType: e.locationType,
      startDate: e.startDate,
      endDate: e.endDate,
      current: e.current,
      summary: e.summary,
      highlights: e.highlights,
    })),
    education: profile.education.map((e) => ({
      id: e.id,
      school: e.school,
      degree: e.degree,
      field: e.field,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate,
      current: e.current,
      grade: e.grade,
      description: e.description,
    })),
    projects: profile.projects.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      description: p.description,
      highlights: p.highlights,
      technologies: p.technologies,
      url: p.url,
      startDate: p.startDate,
      endDate: p.endDate,
      current: p.current,
    })),
    skills: profile.skills.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
    })),
    certifications: profile.certifications.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      issueDate: c.issueDate,
      expiryDate: c.expiryDate,
    })),
    languages: profile.languages.map((l) => ({
      id: l.id,
      name: l.name,
      proficiency: l.proficiency,
    })),
    achievements: profile.achievements.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      date: a.date,
    })),
  };
}
