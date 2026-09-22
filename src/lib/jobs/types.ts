import type {
  EmploymentType,
  LocationType,
  SalaryPeriod,
  Seniority,
} from "@prisma/client";

/**
 * The provider-neutral job shape. Every provider maps its own response into
 * this; nothing above the provider layer ever sees a provider's format.
 */

export const PROVIDER_KEYS = [
  "ashby",
  "greenhouse",
  "lever",
  "adzuna",
] as const;
export type ProviderKey = (typeof PROVIDER_KEYS)[number];

export const PROVIDER_LABEL: Record<ProviderKey, string> = {
  ashby: "Ashby",
  greenhouse: "Greenhouse",
  lever: "Lever",
  adzuna: "Adzuna",
};

export function isProviderKey(value: unknown): value is ProviderKey {
  return (
    typeof value === "string" &&
    (PROVIDER_KEYS as readonly string[]).includes(value)
  );
}

/**
 * What a provider can do. Declared per provider, so the rest of the product
 * asks "can this job be applied to natively?" instead of checking names.
 *
 *   SEARCH             list open jobs
 *   JOB_DETAILS        full posting content
 *   APPLICATION_FORM   read the official application questions
 *   SUBMIT_APPLICATION submit on the candidate's behalf (needs authorisation)
 *   EXTERNAL_APPLY     an official application URL to send the candidate to
 */
export type ProviderCapability =
  | "SEARCH"
  | "JOB_DETAILS"
  | "APPLICATION_FORM"
  | "SUBMIT_APPLICATION"
  | "EXTERNAL_APPLY";

export type ProviderCapabilities = Record<ProviderCapability, boolean>;

export type Salary = {
  min: number | null;
  max: number | null;
  currency: string;
  period: SalaryPeriod;
};

/** What a provider hands to `normalizeJob`: its fields, lightly mapped. */
export type RawJob = {
  externalId: string;
  title: string;
  company: string;
  department?: string | null;
  /** Every location string the provider gives, primary first. */
  locations: string[];
  /** The provider's own workplace signal, if it has one. */
  workplace?: string | null;
  /** The provider's own contract signal, if it has one. */
  employment?: string | null;
  salary?: Salary | null;
  /** Exactly one of these. */
  descriptionHtml?: string | null;
  descriptionText?: string | null;
  descriptionIsExcerpt?: boolean;
  /** Provider-structured sections (Lever `lists`), when they exist. */
  sections?: { heading: string; html: string }[];
  /** Closing text that follows the sections (Lever `additional`). */
  closingHtml?: string | null;
  applyUrl: string;
  sourceUrl?: string | null;
  postedAt?: Date | null;
  updatedAt?: Date | null;
  expiresAt?: Date | null;
};

export type NormalizedJob = {
  provider: ProviderKey;
  externalId: string;
  title: string;
  company: string;
  department: string | null;
  location: string;
  locations: string[];
  locationSearch: string;
  locationType: LocationType | null;
  employmentType: EmploymentType | null;
  seniority: Seniority | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod | null;
  salaryAnnualMin: number | null;
  salaryAnnualMax: number | null;
  summary: string;
  description: string;
  descriptionIsExcerpt: boolean;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  skills: string[];
  applyUrl: string;
  sourceUrl: string | null;
  postedAt: Date | null;
  providerUpdatedAt: Date | null;
  expiresAt: Date | null;
  fingerprint: string;
  contentHash: string;
};
