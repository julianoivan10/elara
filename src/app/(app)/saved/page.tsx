import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";

import { relativeTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { requireUser } from "@/server/auth/guards";
import { CareerService } from "@/services/career.service";
import { JobService } from "@/services/job.service";
import { PageHeader, PageShell } from "@/features/workspace/page-header";
import { JobCard } from "@/features/jobs/job-card";

export const metadata: Metadata = { title: "Saved jobs" };
export const dynamic = "force-dynamic";

export default async function SavedJobsPage() {
  const user = await requireUser();

  const [saved, profileSkills] = await Promise.all([
    JobService.listSaved(user.id),
    CareerService.getSkillNames(user.id),
  ]);

  const matched = new Set(
    profileSkills.map((skill) => skill.toLowerCase().trim()),
  );

  return (
    <PageShell>
      <PageHeader
        label="Saved"
        title="Saved jobs"
        description="Roles you kept for later. Nothing here has been applied to until you say so."
        actions={
          <Button asChild variant="outline">
            <Link href="/jobs">Find more</Link>
          </Button>
        }
      />

      {saved.length === 0 ? (
        <EmptyState
          icon={<Bookmark />}
          title="Nothing saved yet"
          description="Press the bookmark on any opening and it will wait here until you are ready."
          action={
            <Button asChild size="sm">
              <Link href="/jobs">Browse openings</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col">
          {saved.map(({ job, createdAt }) => (
            <div key={job.id}>
              <JobCard job={{ ...job, saved: true }} matchedSkills={matched} />
              <p className="eyebrow -mt-2 pb-4">
                Saved {relativeTime(createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
