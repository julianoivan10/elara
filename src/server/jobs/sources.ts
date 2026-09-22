import "server-only";

import { db } from "@/server/db";
import type { ProviderKey } from "@/lib/jobs/types";

/**
 * The starting set of job sources. Each is a company's own public job board
 * on an ATS that publishes it through an official API — every one was checked
 * to respond before it was added here. More can be added as JobSource rows at
 * any time without a deploy; this list only seeds rows that do not exist, and
 * never re-enables a source that was switched off.
 *
 * Adzuna searches are only used when Adzuna credentials are configured.
 */
export const DEFAULT_SOURCES: {
  provider: ProviderKey;
  key: string;
  name: string;
}[] = [
  // Southeast Asia
  { provider: "lever", key: "GoToGroup", name: "GoTo Group" },
  { provider: "lever", key: "ninjavan", name: "Ninja Van" },
  { provider: "greenhouse", key: "xendit", name: "Xendit" },
  { provider: "ashby", key: "airwallex", name: "Airwallex" },
  // Remote-friendly product companies
  { provider: "ashby", key: "linear", name: "Linear" },
  { provider: "ashby", key: "supabase", name: "Supabase" },
  { provider: "ashby", key: "cursor", name: "Cursor" },
  { provider: "greenhouse", key: "vercel", name: "Vercel" },
  { provider: "greenhouse", key: "gitlab", name: "GitLab" },
  { provider: "greenhouse", key: "figma", name: "Figma" },
  { provider: "greenhouse", key: "discord", name: "Discord" },
  { provider: "lever", key: "spotify", name: "Spotify" },
  // Aggregator searches (need ADZUNA_APP_ID / ADZUNA_APP_KEY)
  {
    provider: "adzuna",
    key: "sg|software engineer|",
    name: "Software engineering in Singapore",
  },
  {
    provider: "adzuna",
    key: "sg|product designer|",
    name: "Product design in Singapore",
  },
];

export async function ensureDefaultSources() {
  await db.jobSource.createMany({
    data: DEFAULT_SOURCES.map((source) => ({ ...source, enabled: true })),
    skipDuplicates: true,
  });
}
