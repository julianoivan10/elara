import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { requireUser } from "@/server/auth/guards";
import { ApplicationService } from "@/services/application.service";
import { PageHeader, PageShell } from "@/features/workspace/page-header";
import { ApplicationsBoard } from "@/features/applications/board";
import { NewApplicationDialog } from "@/features/applications/new-application-dialog";

export const metadata: Metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const user = await requireUser();

  const [{ applications }, stats] = await Promise.all([
    ApplicationService.board(user.id),
    ApplicationService.stats(user.id),
  ]);

  const board = applications.map((application) => ({
    id: application.id,
    company: application.company,
    role: application.role,
    location: application.location,
    url: application.url,
    source: application.source,
    status: application.status,
    appliedAt: application.appliedAt,
    nextEventAt: application.nextEventAt,
    nextEventLabel: application.nextEventLabel,
    updatedAt: application.updatedAt,
    noteCount: application._count.notes,
    job: application.job,
  }));

  return (
    <PageShell>
      <PageHeader
        index="05"
        label="Applications"
        title="Application tracker"
        description={
          stats.total > 0
            ? `${stats.active} in progress, ${stats.interviews} at interview stage, ${stats.offers} offer${stats.offers === 1 ? "" : "s"}.`
            : "Everywhere you have applied, and what happens next."
        }
        actions={<NewApplicationDialog />}
      />

      {board.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="Nothing tracked yet"
          description="Track a role from any posting in ELARA, or add one you applied to elsewhere. Moving a card between stages keeps a dated history you can look back at."
          action={
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/jobs">Find a role</Link>
              </Button>
              <NewApplicationDialog />
            </div>
          }
        />
      ) : (
        <ApplicationsBoard applications={board} />
      )}
    </PageShell>
  );
}
