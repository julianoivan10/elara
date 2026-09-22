import type { ApplicationMethod, ApplicationStatus } from "@prisma/client";

import type { BadgeTone } from "@/components/ui/badge";

/** What the board and its cards need. Kept narrow so the server sends no more. */
export type BoardApplication = {
  id: string;
  company: string;
  role: string;
  location: string | null;
  url: string | null;
  source: string | null;
  status: ApplicationStatus;
  appliedAt: Date | null;
  nextEventAt: Date | null;
  nextEventLabel: string | null;
  updatedAt: Date;
  noteCount: number;
  method: ApplicationMethod;
  /** Job provider ("greenhouse", …) when the application came from a listing. */
  provider: string | null;
  preparedAt: Date | null;
  hasCoverLetter: boolean;
  resume: { id: string; title: string } | null;
  job: {
    id: string;
    title: string;
    company: string;
    isActive: boolean;
    source: string;
  } | null;
};

export const METHOD_LABEL: Record<ApplicationMethod, string> = {
  EXTERNAL_LINK: "Applied on the official site",
  ASSISTED: "Prepared in ELARA, applied on the official site",
  ATS: "Submitted through the employer's system",
};

/**
 * Status colour, chosen so the seven stages stay distinguishable at a glance
 * and terminal states read as terminal.
 */
export const STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  SAVED: "neutral",
  PREPARED: "outline",
  APPLIED: "cobalt",
  SCREENING: "info",
  ASSESSMENT: "warning",
  INTERVIEW: "lime",
  OFFER: "success",
  REJECTED: "danger",
};

export const STATUS_ORDER: ApplicationStatus[] = [
  "SAVED",
  "PREPARED",
  "APPLIED",
  "SCREENING",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  PREPARED: "Prepared",
  APPLIED: "Applied",
  SCREENING: "Screening",
  ASSESSMENT: "Assessment",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};
