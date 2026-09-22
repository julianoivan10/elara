import "server-only";

import type { ProviderKey } from "@/lib/jobs/types";
import type { JobProvider } from "@/server/jobs/provider";
import { ashbyProvider } from "@/server/jobs/providers/ashby";
import { greenhouseProvider } from "@/server/jobs/providers/greenhouse";
import { leverProvider } from "@/server/jobs/providers/lever";
import { adzunaProvider } from "@/server/jobs/providers/adzuna";

/**
 * The provider registry. SEEK (or any other source) joins here once access is
 * granted: implement JobProvider, add it to this map, add its sources.
 */
export const PROVIDERS: Record<ProviderKey, JobProvider> = {
  ashby: ashbyProvider,
  greenhouse: greenhouseProvider,
  lever: leverProvider,
  adzuna: adzunaProvider,
};

export function getProvider(key: string): JobProvider | null {
  return (PROVIDERS as Record<string, JobProvider>)[key] ?? null;
}
