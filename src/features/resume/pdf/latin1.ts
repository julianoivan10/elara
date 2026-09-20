import type {
  ResumeDocument,
  ResumeSectionData,
} from "@/features/resume/document";

/**
 * Text preparation for the PDF's core fonts.
 *
 * Helvetica and Times are built into every PDF reader, which is why ELARA uses
 * them: nothing is embedded and the file opens identically everywhere. The
 * trade is that they encode Latin-1 only, so characters above U+00FF are
 * dropped by the encoder rather than rendered — an em dash or a bullet simply
 * vanishes from the page.
 *
 * The typographic punctuation the product uses is therefore folded to its
 * Latin-1 equivalent on the way into the PDF. The on-screen preview keeps the
 * proper characters; only the export substitutes.
 *
 * Known limitation: a name written in a script outside Latin-1 (Cyrillic, Greek,
 * CJK) cannot be rendered by the core fonts. Supporting those means registering
 * an embedded TTF with react-pdf's Font.register and shipping the file — a
 * deliberate next step rather than something to fake here, so such characters
 * are passed through and will be missing rather than silently transliterated
 * into something wrong.
 */
const SUBSTITUTIONS: Record<string, string> = {
  "—": "-", // em dash
  "–": "-", // en dash
  "‒": "-", // figure dash
  "‐": "-", // hyphen
  "‑": "-", // non-breaking hyphen
  "•": "-", // bullet (templates draw their own marker instead)
  "‣": "-",
  "◦": "-",
  "‘": "'", // curly quotes
  "’": "'",
  "‚": ",",
  "“": '"',
  "”": '"',
  "…": "...", // ellipsis
  "→": "->",
  "←": "<-",
  "≤": "<=",
  "≥": ">=",
  " ": " ", // non-breaking space
  " ": " ", // thin space
  " ": " ",
  "​": "", // zero-width space
  "﻿": "",
};

const PATTERN = new RegExp(`[${Object.keys(SUBSTITUTIONS).join("")}]`, "g");

export function latin1(value: string): string {
  return value.replace(PATTERN, (char) => SUBSTITUTIONS[char] ?? char);
}

function maybe(value: string | null | undefined) {
  return value === null || value === undefined ? value : latin1(value);
}

/**
 * Fold an entire document once, before rendering, rather than wrapping every
 * Text node at the call site — one pass, and no way to forget a field.
 */
export function toLatin1Document(doc: ResumeDocument): ResumeDocument {
  return {
    header: {
      name: latin1(doc.header.name),
      headline: maybe(doc.header.headline),
      location: maybe(doc.header.location),
      email: maybe(doc.header.email),
      phone: maybe(doc.header.phone),
      website: maybe(doc.header.website),
      links: doc.header.links.map((link) => ({
        label: latin1(link.label),
        // URLs stay verbatim: the link target must not be rewritten.
        url: link.url,
      })),
    },
    sections: doc.sections.map(foldSection),
  };
}

function foldSection(section: ResumeSectionData): ResumeSectionData {
  const title = latin1(section.title);

  switch (section.kind) {
    case "SUMMARY":
      return { ...section, title, body: latin1(section.body) };

    case "EXPERIENCE":
      return {
        ...section,
        title,
        items: section.items.map((item) => ({
          ...item,
          role: latin1(item.role),
          company: latin1(item.company),
          location: maybe(item.location),
          period: maybe(item.period),
          summary: maybe(item.summary),
          highlights: item.highlights.map(latin1),
        })),
      };

    case "EDUCATION":
      return {
        ...section,
        title,
        items: section.items.map((item) => ({
          ...item,
          school: latin1(item.school),
          qualification: maybe(item.qualification),
          location: maybe(item.location),
          period: maybe(item.period),
          detail: maybe(item.detail),
        })),
      };

    case "PROJECTS":
      return {
        ...section,
        title,
        items: section.items.map((item) => ({
          ...item,
          name: latin1(item.name),
          role: maybe(item.role),
          period: maybe(item.period),
          description: maybe(item.description),
          highlights: item.highlights.map(latin1),
          technologies: item.technologies.map(latin1),
        })),
      };

    case "SKILLS":
      return {
        ...section,
        title,
        groups: section.groups.map((group) => ({
          label: maybe(group.label) ?? null,
          items: group.items.map(latin1),
        })),
      };

    case "CERTIFICATIONS":
    case "LANGUAGES":
    case "ACHIEVEMENTS":
      return {
        ...section,
        title,
        items: section.items.map((item) => ({
          ...item,
          primary: latin1(item.primary),
          secondary: maybe(item.secondary),
          meta: maybe(item.meta),
        })),
      };

    case "LINKS":
      return {
        ...section,
        title,
        items: section.items.map((item) => ({
          label: latin1(item.label),
          url: item.url,
        })),
      };
  }
}
