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
import { RemoveClosedButton } from "@/features/jobs/remove-closed-button";

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
  const closed = saved.filter((row) => !row.live).length;

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
          {closed > 0 ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-rule bg-raised/50 px-4 py-3">
              <p className="text-[0.8125rem] text-ink-muted">
                {closed} saved listing{closed === 1 ? " has" : "s have"} closed
                since you saved {closed === 1 ? "it" : "them"}.
              </p>
              <RemoveClosedButton />
            </div>
          ) : null}
          {saved.map(({ job, createdAt, live }) => (
            <div key={job.id} className={live ? undefined : "opacity-70"}>
              <JobCard job={{ ...job, saved: true }} matchedSkills={matched} />
              <p className="eyebrow -mt-2 pb-4">
                Saved {relativeTime(createdAt)}
                {live ? null : (
                  <span className="ml-2 text-warning">· No longer open</span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
