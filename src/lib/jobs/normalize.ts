import { createHash } from "node:crypto";
import type {
  EmploymentType,
  LocationType,
  SalaryPeriod,
  Seniority,
} from "@prisma/client";

import {
  blocksToText,
  htmlToBlocks,
  plainToBlocks,
  type TextBlock,
} from "@/lib/jobs/html-text";
import { extractSkills } from "@/lib/jobs/skills";
import type { NormalizedJob, ProviderKey, RawJob } from "@/lib/jobs/types";

/**
 * Provider fields → one normalised job.
 *
 * The rule throughout: map what the provider said, infer only from the
 * posting's own words, and leave everything else null. A missing salary stays
 * missing; a location that never says "remote" is not declared on-site.
 */

/* ------------------------------------------------------------ locations */

/**
 * Split a free-text location field into its parts. Commas are kept ("San
 * Francisco, CA" is one place); bullets, semicolons, pipes and " or " split.
 */
export function splitLocations(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\s*(?:•|;|\||\s\/\s|\sor\s|\sOR\s)\s*/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function uniqueLocations(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values.flatMap(splitLocations)) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(value);
    }
  }
  return out;
}

/* ---------------------------------------------------------- work & type */

export function mapLocationType(
  explicit: string | null | undefined,
  locations: string[],
  title: string,
): LocationType | null {
  const value = (explicit ?? "").toLowerCase().replace(/[\s_-]/g, "");
  if (value === "remote") return "REMOTE";
  if (value === "hybrid") return "HYBRID";
  if (value === "onsite" || value === "inoffice" || value === "office")
    return "ONSITE";

  // No explicit signal: only the posting's own words count.
  const words = `${locations.join(" ")} ${title}`.toLowerCase();
  if (/\bhybrid\b/.test(words)) return "HYBRID";
  if (/\bremote\b/.test(words)) return "REMOTE";
  return null;
}

export function mapEmploymentType(
  raw: string | null | undefined,
): EmploymentType | null {
  const value = (raw ?? "").toLowerCase();
  if (!value) return null;
  if (/intern/.test(value)) return "INTERNSHIP";
  if (/volunteer/.test(value)) return "VOLUNTEER";
  if (/freelanc/.test(value)) return "FREELANCE";
  if (/part[\s_-]*time|parttime/.test(value)) return "PART_TIME";
  if (/contract|temporary|temp\b|fixed[\s_-]*term|short[\s_-]*term/.test(value))
    return "CONTRACT";
  if (/full[\s_-]*time|fulltime|permanent|regular/.test(value))
    return "FULL_TIME";
  return null;
}

/** Seniority from the title only; no title signal means unknown. */
export function inferSeniority(title: string): Seniority | null {
  const t = title.toLowerCase();
  if (/\b(intern|internship)\b/.test(t)) return "INTERNSHIP";
  // A range ("Senior / Staff", "Senior or Lead") is open from its lower end.
  if (/\b(senior|sr\.?)\s*(\/|or)\s*(staff|principal|lead)\b/.test(t))
    return "SENIOR";
  // Not "manager": an account or product manager is a role, not a level.
  if (/\b(head of|director|principal|staff|lead|vp|vice president)\b/.test(t))
    return "LEAD";
  if (/\b(senior|sr\.?)\b/.test(t)) return "SENIOR";
  if (/\b(junior|jr\.?|graduate|entry[\s-]level|new grad|associate)\b/.test(t))
    return "ENTRY";
  return null;
}

/* --------------------------------------------------------------- salary */

const PERIOD_FACTOR: Record<SalaryPeriod, number> = {
  HOUR: 2080,
  MONTH: 12,
  YEAR: 1,
};

export function annualize(value: number | null, period: SalaryPeriod | null) {
  if (value == null || !period) return null;
  return Math.round(value * PERIOD_FACTOR[period]);
}

/* ------------------------------------------------------------- sections */

const RESPONSIBILITIES =
  /(what you('|’)?ll (do|be doing|work on)|what you will (do|be doing)|responsibilit|your role|the role|in this role|day[- ]to[- ]day|you will|key duties|duties|your impact|what you('|’)?ll own)/i;
const REQUIREMENTS =
  /(requirement|qualification|what you('|’)?ll (need|bring)|what you will bring|who you are|you have|you bring|about you|what we('|’)?re looking for|we('|’)?re looking for|must[- ]have|you might be|you should|ideal candidate|minimum|preferred|nice to have|bonus points|skills|experience you)/i;
const BENEFITS =
  /(benefit|perk|what we offer|we offer|why join|what you('|’)?ll get|what('|’)?s in it|our offer)/i;

type Sections = {
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
};

/**
 * Pull the posting's own lists into requirements / responsibilities /
 * benefits by the heading above them. Only text the posting wrote is used;
 * a list under an unrecognised heading stays in the description only.
 */
export function extractSections(blocks: TextBlock[]): Sections {
  const out: Sections = {
    responsibilities: [],
    requirements: [],
    benefits: [],
  };
  let current: keyof Sections | null = null;

  for (const block of blocks) {
    if (
      block.type === "heading" ||
      (block.type === "paragraph" &&
        block.text.length <= 80 &&
        block.text.endsWith(":"))
    ) {
      current = classify(block.text);
      continue;
    }
    if (block.type === "list" && current) {
      out[current].push(...block.items.filter((item) => item.length <= 400));
    } else if (block.type === "paragraph" && block.text.length > 200) {
      // A long paragraph ends a section: what follows is new prose.
      current = null;
    }
  }

  return {
    responsibilities: out.responsibilities.slice(0, 20),
    requirements: out.requirements.slice(0, 20),
    benefits: out.benefits.slice(0, 20),
  };
}

function classify(heading: string): keyof Sections | null {
  if (BENEFITS.test(heading)) return "benefits";
  if (RESPONSIBILITIES.test(heading)) return "responsibilities";
  if (REQUIREMENTS.test(heading)) return "requirements";
  return null;
}

/* ------------------------------------------------------------- identity */

const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(
      /\b(inc|llc|ltd|limited|corp|corporation|gmbh|pte|pt|co|plc|sa|bv)\b\.?/g,
      "",
    )
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * The same real job, whatever board or aggregator it came through: company,
 * title and the city of the primary location. Hashed for a fixed-width index.
 */
export function jobFingerprint(
  company: string,
  title: string,
  location: string,
) {
  const city = norm(location.split(",")[0] ?? "");
  return createHash("sha1")
    .update(`${norm(company)}|${norm(title)}|${city}`)
    .digest("hex");
}

function summarize(blocks: TextBlock[]): string {
  const paragraph =
    blocks.find((b) => b.type === "paragraph" && b.text.length >= 60) ??
    blocks.find((b) => b.type === "paragraph");
  const text = paragraph?.type === "paragraph" ? paragraph.text : "";
  if (text.length <= 280) return text;
  const cut = text.slice(0, 280);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/* ------------------------------------------------------------ normalise */

export function normalizeJob(
  provider: ProviderKey,
  raw: RawJob,
): NormalizedJob {
  const blocks = raw.descriptionHtml
    ? htmlToBlocks(raw.descriptionHtml)
    : plainToBlocks(raw.descriptionText ?? "");

  // Provider-structured sections (Lever lists) are appended as real headed
  // lists, so they are both displayed and classified.
  for (const section of raw.sections ?? []) {
    const items = htmlToBlocks(section.html).flatMap((b) =>
      b.type === "list" ? b.items : b.type === "paragraph" ? [b.text] : [],
    );
    if (items.length) {
      blocks.push({
        type: "heading",
        text: section.heading.trim().replace(/:$/, ""),
      });
      blocks.push({ type: "list", items });
    }
  }

  if (raw.closingHtml) blocks.push(...htmlToBlocks(raw.closingHtml));

  const description = blocksToText(blocks);
  const locations = uniqueLocations(raw.locations);
  const location = locations[0] ?? "Location not specified";
  const sections = extractSections(blocks);
  const salary =
    raw.salary && (raw.salary.min != null || raw.salary.max != null)
      ? raw.salary
      : null;

  const job: Omit<NormalizedJob, "contentHash"> = {
    provider,
    externalId: raw.externalId,
    title: raw.title.trim(),
    company: raw.company.trim(),
    department: raw.department?.trim() || null,
    location,
    locations,
    locationSearch: locations.join(" | ").toLowerCase(),
    locationType: mapLocationType(raw.workplace, locations, raw.title),
    employmentType: mapEmploymentType(raw.employment),
    seniority: inferSeniority(raw.title),
    salaryMin: salary?.min ?? null,
    salaryMax: salary?.max ?? null,
    salaryCurrency: salary?.currency ?? null,
    salaryPeriod: salary?.period ?? null,
    salaryAnnualMin: annualize(salary?.min ?? null, salary?.period ?? null),
    salaryAnnualMax: annualize(
      salary?.max ?? salary?.min ?? null,
      salary?.period ?? null,
    ),
    summary: summarize(blocks),
    description,
    descriptionIsExcerpt: raw.descriptionIsExcerpt ?? false,
    requirements: sections.requirements,
    responsibilities: sections.responsibilities,
    benefits: sections.benefits,
    skills: extractSkills(`${raw.title}\n${description}`, [raw.company]),
    applyUrl: raw.applyUrl,
    sourceUrl: raw.sourceUrl ?? null,
    postedAt: raw.postedAt ?? null,
    providerUpdatedAt: raw.updatedAt ?? null,
    expiresAt: raw.expiresAt ?? null,
    fingerprint: jobFingerprint(raw.company, raw.title, location),
  };

  return { ...job, contentHash: contentHash(job) };
}

/** Hash of everything a user can see, so an unchanged listing is not rewritten. */
export function contentHash(job: Omit<NormalizedJob, "contentHash">) {
  const { providerUpdatedAt: _u, ...visible } = job;
  void _u;
  return createHash("sha1").update(JSON.stringify(visible)).digest("hex");
}

/** A URL a job can safely link to: absolute http(s) only. */
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function parseDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const date =
    typeof value === "number" ? new Date(value) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
