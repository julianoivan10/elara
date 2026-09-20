import type { ApplicationStatus } from "@prisma/client";

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
  job: { id: string; title: string; company: string } | null;
};

/**
 * Status colour, chosen so the seven stages stay distinguishable at a glance
 * and terminal states read as terminal.
 */
export const STATUS_TONE: Record<ApplicationStatus, BadgeTone> = {
  SAVED: "neutral",
  APPLIED: "cobalt",
  SCREENING: "info",
  ASSESSMENT: "warning",
  INTERVIEW: "lime",
  OFFER: "success",
  REJECTED: "danger",
};

export const STATUS_ORDER: ApplicationStatus[] = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  SCREENING: "Screening",
  ASSESSMENT: "Assessment",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};
