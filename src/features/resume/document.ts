/**
 * The resume document model.
 *
 * This is the contract between everything that touches a resume: the editor
 * writes it, the on-screen templates render it, and the PDF renderer renders the
 * very same object. Templates change presentation only — never the shape of the
 * data — which is what lets a user switch template without losing anything.
 */

export type ResumeLink = { label: string; url: string };

export type ResumeHeader = {
  name: string;
  headline?: string | null;
  location?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  links: ResumeLink[];
};

export type ExperienceEntry = {
  id: string;
  role: string;
  company: string;
  location?: string | null;
  period?: string | null;
  summary?: string | null;
  highlights: string[];
};

export type EducationEntry = {
  id: string;
  school: string;
  qualification?: string | null;
  location?: string | null;
  period?: string | null;
  detail?: string | null;
};

export type ProjectEntry = {
  id: string;
  name: string;
  role?: string | null;
  period?: string | null;
  description?: string | null;
  highlights: string[];
  technologies: string[];
  url?: string | null;
};

export type SkillGroup = { label: string | null; items: string[] };

export type SimpleEntry = {
  id: string;
  primary: string;
  secondary?: string | null;
  meta?: string | null;
};

export type ResumeSectionData =
  | { kind: "SUMMARY"; title: string; body: string }
  | { kind: "EXPERIENCE"; title: string; items: ExperienceEntry[] }
  | { kind: "EDUCATION"; title: string; items: EducationEntry[] }
  | { kind: "PROJECTS"; title: string; items: ProjectEntry[] }
  | { kind: "SKILLS"; title: string; groups: SkillGroup[] }
  | { kind: "CERTIFICATIONS"; title: string; items: SimpleEntry[] }
  | { kind: "LANGUAGES"; title: string; items: SimpleEntry[] }
  | { kind: "ACHIEVEMENTS"; title: string; items: SimpleEntry[] }
  | { kind: "LINKS"; title: string; items: ResumeLink[] };

export type ResumeSectionKindData = ResumeSectionData["kind"];

export type ResumeDocument = {
  header: ResumeHeader;
  /** Ordered, already filtered to visible and non-empty sections. */
  sections: ResumeSectionData[];
};

/* -------------------------------------------------------------------- theme */

export const RESUME_ACCENTS = {
  cobalt: { label: "Cobalt", value: "#1430CC" },
  ink: { label: "Ink", value: "#14130F" },
  coral: { label: "Coral", value: "#C23A1B" },
  forest: { label: "Forest", value: "#14804A" },
  slate: { label: "Slate", value: "#3F4A5A" },
} as const;

export type AccentKey = keyof typeof RESUME_ACCENTS;

/**
 * Only the two PDF core font families are offered.
 *
 * They need no embedding, render identically on every reader, and are what an
 * applicant tracking system parses most reliably. Matching CSS stacks are used
 * on screen so the preview and the exported file agree.
 */
export const RESUME_FONTS = {
  sans: {
    label: "Helvetica",
    pdf: "Helvetica",
    pdfBold: "Helvetica-Bold",
    pdfOblique: "Helvetica-Oblique",
    css: "Helvetica, Arial, 'Liberation Sans', sans-serif",
  },
  serif: {
    label: "Times",
    pdf: "Times-Roman",
    pdfBold: "Times-Bold",
    pdfOblique: "Times-Italic",
    css: "'Times New Roman', Times, 'Liberation Serif', serif",
  },
} as const;

export type FontKey = keyof typeof RESUME_FONTS;

export const RESUME_DENSITIES = {
  compact: { label: "Compact" },
  regular: { label: "Regular" },
  relaxed: { label: "Relaxed" },
} as const;

export type DensityKey = keyof typeof RESUME_DENSITIES;

/**
 * Metrics are expressed in PDF points. The on-screen page multiplies them by
 * 4/3 to reach CSS pixels at 96dpi, so one set of numbers drives both outputs
 * and the preview is a true representation of the export.
 */
export type ResumeMetrics = {
  margin: number;
  base: number;
  lead: number;
  name: number;
  headline: number;
  sectionTitle: number;
  itemTitle: number;
  meta: number;
  sectionGap: number;
  itemGap: number;
  lineGap: number;
};

const METRICS: Record<DensityKey, ResumeMetrics> = {
  compact: {
    margin: 40,
    base: 9,
    lead: 1.32,
    name: 18,
    headline: 9.5,
    sectionTitle: 8,
    itemTitle: 9.5,
    meta: 8,
    sectionGap: 11,
    itemGap: 6,
    lineGap: 2,
  },
  regular: {
    margin: 50,
    base: 10,
    lead: 1.42,
    name: 21,
    headline: 10.5,
    sectionTitle: 8.5,
    itemTitle: 10.5,
    meta: 8.5,
    sectionGap: 14,
    itemGap: 8,
    lineGap: 3,
  },
  relaxed: {
    margin: 58,
    base: 11,
    lead: 1.5,
    name: 24,
    headline: 11.5,
    sectionTitle: 9,
    itemTitle: 11.5,
    meta: 9,
    sectionGap: 18,
    itemGap: 11,
    lineGap: 4,
  },
};

export type ResumeTheme = {
  accent: string;
  accentKey: AccentKey;
  font: (typeof RESUME_FONTS)[FontKey];
  fontKey: FontKey;
  metrics: ResumeMetrics;
  density: DensityKey;
};

export function resolveTheme(input: {
  accentKey?: string | null;
  fontKey?: string | null;
  density?: string | null;
}): ResumeTheme {
  const accentKey = (
    input.accentKey && input.accentKey in RESUME_ACCENTS
      ? input.accentKey
      : "cobalt"
  ) as AccentKey;

  const fontKey = (
    input.fontKey && input.fontKey in RESUME_FONTS ? input.fontKey : "sans"
  ) as FontKey;

  const density = (
    input.density && input.density in RESUME_DENSITIES
      ? input.density
      : "regular"
  ) as DensityKey;

  return {
    accentKey,
    accent: RESUME_ACCENTS[accentKey].value,
    fontKey,
    font: RESUME_FONTS[fontKey],
    metrics: METRICS[density],
    density,
  };
}

/* ------------------------------------------------------------- page geometry */

/** A4 in PDF points. */
export const A4 = { width: 595.28, height: 841.89 } as const;

/** Points to CSS pixels at 96dpi. */
export const PT_TO_PX = 96 / 72;

export const A4_PX = {
  width: Math.round(A4.width * PT_TO_PX),
  height: Math.round(A4.height * PT_TO_PX),
} as const;

/* ------------------------------------------------------------------ helpers */

/** True when a section would render nothing, so templates can skip it. */
export function isSectionEmpty(section: ResumeSectionData): boolean {
  switch (section.kind) {
    case "SUMMARY":
      return section.body.trim().length === 0;
    case "SKILLS":
      return section.groups.every((group) => group.items.length === 0);
    case "LINKS":
      return section.items.length === 0;
    default:
      return section.items.length === 0;
  }
}

/** Strip a protocol so a printed link reads as "amara.build/tideline". */
export function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function contactLine(header: ResumeHeader): string[] {
  return [header.location, header.email, header.phone, header.website]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => value.trim());
}
