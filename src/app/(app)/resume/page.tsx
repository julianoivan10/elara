import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { requireUser } from "@/server/auth/guards";
import { CareerService } from "@/services/career.service";
import { computeCompletion } from "@/lib/completion";
import { ResumeService } from "@/services/resume.service";
import { PageHeader, PageShell } from "@/features/workspace/page-header";
import { ResumeCard } from "@/features/resume/resume-card";
import { NewResumeDialog } from "@/features/resume/new-resume-dialog";

export const metadata: Metadata = { title: "Resumes" };
export const dynamic = "force-dynamic";

export default async function ResumeListPage() {
  const user = await requireUser();

  const [resumes, profile] = await Promise.all([
    ResumeService.listForGallery(user.id),
    CareerService.getProfile(user.id),
  ]);

  const completion = computeCompletion(profile);
  const thin = completion.percent < 40;

  return (
    <PageShell>
      <PageHeader
        index="02"
        label="Resumes"
        title="Resumes"
        description="Each one is a view of the same career profile. Change a fact once and every resume follows."
        actions={
          <NewResumeDialog suggestedTitle={profile?.headline ?? undefined} />
        }
      />

      {/* A resume built from an empty profile is an empty resume — say so
          before someone makes one and wonders why. */}
      {thin && resumes.length === 0 ? (
        <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-warning/25 bg-warning-tint px-4 py-3">
          <p className="flex-1 text-[0.8125rem] text-warning">
            Your profile is {completion.percent}% complete. A resume is built
            from it, so it is worth filling in a role or two first.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/profile">Go to your profile</Link>
          </Button>
        </div>
      ) : null}

      {resumes.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No resumes yet"
          description="Create one and ELARA lays out everything on your profile. You can switch template, hide sections and export a PDF at any point."
          action={<NewResumeDialog label="Create your first resume" />}
        />
      ) : (
        <div className="grid gap-x-6 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
          {resumes.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
