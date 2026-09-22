import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { JobService } from "@/services/job.service";
import { ResumeService } from "@/services/resume.service";
import { AiService } from "@/services/ai.service";
import { applicationChannelFor } from "@/server/jobs/application-channel";
import { PageHeader, PageShell } from "@/features/workspace/page-header";
import { ApplyPrep } from "@/features/jobs/apply-prep";
import type { PreparedAnswer } from "@/services/application.service";

export const metadata: Metadata = { title: "Prepare application" };
export const dynamic = "force-dynamic";
/** Covers the cover-letter draft action on this page. */
export const maxDuration = 60;

/**
 * Level 1 application: everything gets ready here, the person applies on the
 * official page. No provider ELARA reads from gives it an authorised way to
 * submit, so this page never pretends to.
 */
export default async function PrepareApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const job = await JobService.get(id, user.id);
  if (!job) notFound();

  const [resumes, application] = await Promise.all([
    ResumeService.list(user.id),
    db.application.findFirst({
      where: { userId: user.id, jobId: job.id },
      select: {
        id: true,
        status: true,
        resumeId: true,
        coverLetter: true,
        answers: true,
        appliedAt: true,
      },
    }),
  ]);

  const answers = Array.isArray(application?.answers)
    ? (application.answers as unknown as PreparedAnswer[]).filter(
        (a) => typeof a?.question === "string" && typeof a?.answer === "string",
      )
    : [];

  // Prefer a resume already aimed at this job, then the most recent.
  const suggested =
    resumes.find((r) => r.targetJob?.id === job.id)?.id ??
    resumes[0]?.id ??
    null;

  return (
    <PageShell className="max-w-4xl">
      <Link
        href={`/jobs/${job.id}`}
        className="group mb-6 inline-flex items-center gap-2 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
        Back to the posting
      </Link>

      <PageHeader
        label="Application"
        title={`${job.title} at ${job.company}`}
        description="Get your resume, cover letter and answers ready here. Then apply on the official page — ELARA does not submit applications for you."
      />

      <ApplyPrep
        job={{
          id: job.id,
          title: job.title,
          company: job.company,
          applyUrl: job.applyUrl,
          applyLabel: applicationChannelFor(job).applyLabel.replace(
            "Apply on",
            "Open the application on",
          ),
          live: job.live,
        }}
        resumes={resumes.map((r) => ({
          id: r.id,
          title: r.title,
          forThisJob: r.targetJob?.id === job.id,
        }))}
        initial={{
          applicationId: application?.id ?? null,
          status: application?.status ?? null,
          resumeId: application?.resumeId ?? suggested,
          coverLetter: application?.coverLetter ?? "",
          answers,
          applied: Boolean(
            application?.appliedAt &&
            application.status !== "SAVED" &&
            application.status !== "PREPARED",
          ),
        }}
        aiEnabled={AiService.configured}
      />
    </PageShell>
  );
}
