import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleSlash,
  MapPin,
} from "lucide-react";

import { cn } from "@/lib/cn";
import {
  fullDate,
  humanizeEnum,
  postedLabel,
  relativeTime,
  salaryRange,
} from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/editorial";
import { requireUser } from "@/server/auth/guards";
import { JobService } from "@/services/job.service";
import { MatchService } from "@/services/match.service";
import { ResumeService } from "@/services/resume.service";
import { AiService } from "@/services/ai.service";
import { applicationChannelFor } from "@/server/jobs/application-channel";
import { PageShell } from "@/features/workspace/page-header";
import { SaveButton } from "@/features/jobs/job-card";
import { JobActions } from "@/features/jobs/job-actions";
import { JobAnalysis } from "@/features/ai/job-analysis";
import { JobDescription, SourceLabel } from "@/features/jobs/job-source";
import type { MatchResult } from "@/lib/jobs/match";

export const dynamic = "force-dynamic";
/** Covers the assistant's server actions on this page (see src/server/ai/gemini.ts). */
export const maxDuration = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await JobService.get(id);
  return { title: job ? `${job.title} at ${job.company}` : "Job" };
}

const workplaceLabel = (value: string) =>
  value === "ONSITE" ? "On-site" : humanizeEnum(value);

const REASON: Record<string, string> = {
  removed: "The company has taken this posting down.",
  expired: "The application deadline has passed.",
  stale:
    "The source has not confirmed this posting recently, so it is treated as closed.",
  duplicate:
    "The same role is listed directly by the company; see its own posting.",
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const job = await JobService.get(id, user.id);
  if (!job) notFound();

  const [{ ready, match }, resumes] = await Promise.all([
    MatchService.forJob(user.id, job),
    ResumeService.list(user.id),
  ]);

  const salary = salaryRange(job);
  const posted = postedLabel(job.postedAt);
  const channel = applicationChannelFor(job);
  // Some boards have no salary field but state pay in the posting's text.
  // That text is not parsed into figures (too easy to misread), but the label
  // must not claim no salary was given.
  const payInText =
    !salary &&
    /(?:[$€£¥₹]|\b(?:USD|SGD|EUR|GBP|IDR|MYR|AUD|CAD|INR|Rp)\s?)\d[\d,.]*\s?[kK]?/.test(
      job.description,
    );
  const payLabel =
    salary ?? (payInText ? "Pay stated in the posting" : "Salary not provided");
  const facts = [
    job.locationType ? workplaceLabel(job.locationType) : null,
    job.employmentType ? humanizeEnum(job.employmentType) : null,
  ].filter(Boolean) as string[];

  return (
    <PageShell>
      <Link
        href="/jobs"
        className="group mb-6 inline-flex items-center gap-2 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
        All openings
      </Link>

      {!job.live ? (
        <div className="mb-8 flex items-start gap-3 rounded-md border border-warning/25 bg-warning-tint px-4 py-3 text-[0.8125rem] leading-relaxed text-warning">
          <CircleSlash className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-medium">This listing is no longer open.</span>{" "}
            {REASON[job.inactiveReason ?? ""] ??
              "It is no longer listed by its source."}{" "}
            It stays here because you saved or tracked it.
          </p>
        </div>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
        {/* ------------------------------------------------------ posting */}
        <div className="min-w-0 lg:col-span-8">
          <header className="border-b border-ink pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Eyebrow>{job.company}</Eyebrow>
              <SourceLabel source={job.source} long />
            </div>

            <h1 className="mt-3 text-[clamp(1.5rem,1.2rem+1.4vw,2.125rem)] leading-[1.08] tracking-[-0.03em] text-ink [overflow-wrap:anywhere]">
              {job.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8125rem] text-ink-muted">
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0 text-ink-ghost" />
                <span className="[overflow-wrap:anywhere]">
                  {job.locations.length > 1
                    ? job.locations.join(" · ")
                    : job.location}
                </span>
              </span>
              {facts.length ? (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-ink-ghost" />
                  {facts.join(" · ")}
                </span>
              ) : null}
              {posted ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-ink-ghost" />
                  Posted {posted.toLowerCase()}
                </span>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {job.seniority ? (
                <Badge tone="outline">
                  {humanizeEnum(job.seniority)} level
                </Badge>
              ) : null}
              {job.department ? (
                <Badge tone="neutral">{job.department}</Badge>
              ) : null}
              {salary ? (
                <Badge tone="cobalt">{salary}</Badge>
              ) : (
                <Badge tone="outline">{payLabel}</Badge>
              )}
            </div>

            {/* On a phone the action panel sits below the whole posting, so
                the two things most people came to do are repeated here. */}
            {job.live ? (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row lg:hidden">
                <Button asChild size="sm">
                  <Link href={`/jobs/${job.id}/apply`}>
                    Prepare application
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={channel.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {channel.applyLabel}
                  </a>
                </Button>
              </div>
            ) : null}
          </header>

          {job.descriptionIsExcerpt ? (
            <p className="mt-6 rounded-md border border-rule bg-raised/60 px-4 py-3 text-[0.8125rem] leading-relaxed text-ink-muted">
              This is a short excerpt supplied by{" "}
              {job.source === "adzuna" ? "Adzuna" : "the source"}. The full
              posting, and the application, are on the job site.
            </p>
          ) : null}

          {job.requirements.length ? (
            <section className="mt-8 flex flex-col gap-3 rounded-lg border border-rule bg-surface p-5">
              <Eyebrow>At a glance: what they ask for</Eyebrow>
              <ul className="flex flex-col gap-2">
                {job.requirements.slice(0, 6).map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-[0.875rem] leading-relaxed text-ink-muted"
                  >
                    <span
                      data-numeric
                      aria-hidden
                      className="shrink-0 pt-0.5 font-mono text-[0.6875rem] text-ink-ghost"
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 max-w-[64ch]">{item}</span>
                  </li>
                ))}
              </ul>
              {job.requirements.length > 6 ? (
                <p className="text-[0.75rem] text-ink-faint">
                  {job.requirements.length - 6} more in the full posting below.
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="mt-10 flex flex-col gap-4">
            <Eyebrow className="border-b border-rule pb-2.5">
              The full posting
            </Eyebrow>
            <JobDescription text={job.description} />
          </section>
        </div>

        {/* -------------------------------------------------------- aside */}
        <aside className="min-w-0 lg:col-span-4">
          <div className="flex flex-col gap-8 lg:sticky lg:top-8">
            <div className="flex flex-col gap-4 rounded-lg border border-rule bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <Eyebrow>Your move</Eyebrow>
                <SaveButton
                  jobId={job.id}
                  title={job.title}
                  initialSaved={job.saved}
                  withLabel
                />
              </div>

              <JobActions
                jobId={job.id}
                applyUrl={channel.applyUrl}
                applyLabel={channel.applyLabel}
                live={job.live}
                resumes={resumes.map((r) => ({ id: r.id, title: r.title }))}
                tracked={Boolean(job.application)}
              />

              {job.application ? (
                <p className="border-t border-rule pt-3 text-[0.75rem] text-ink-muted">
                  On your tracker as{" "}
                  <Link
                    href="/applications"
                    className="text-cobalt-ink underline decoration-cobalt-soft underline-offset-4"
                  >
                    {humanizeEnum(job.application.status)}
                  </Link>
                  .
                </p>
              ) : null}
              <p className="text-[0.6875rem] leading-relaxed text-ink-faint">
                ELARA does not submit applications for you. You apply on the
                official page; ELARA helps you prepare and keeps track.
              </p>
            </div>

            <MatchPanel ready={ready} match={match} skills={job.skills} />

            {AiService.configured && !job.descriptionIsExcerpt ? (
              <JobAnalysis jobId={job.id} />
            ) : null}

            <dl className="flex flex-col gap-3 border-t border-rule pt-5 text-[0.8125rem]">
              <Meta label="Company" value={job.company} />
              <Meta
                label="Location"
                value={job.locations.join(" · ") || job.location}
              />
              {job.locationType ? (
                <Meta
                  label="Workplace"
                  value={workplaceLabel(job.locationType)}
                />
              ) : null}
              {job.employmentType ? (
                <Meta
                  label="Contract"
                  value={humanizeEnum(job.employmentType)}
                />
              ) : null}
              <Meta label="Pay" value={payLabel} muted={!salary} />
              {job.postedAt ? (
                <Meta label="Posted" value={fullDate(job.postedAt) ?? ""} />
              ) : null}
              {job.expiresAt ? (
                <Meta label="Closes" value={fullDate(job.expiresAt) ?? ""} />
              ) : null}
              <Meta label="Last checked" value={relativeTime(job.lastSeenAt)} />
            </dl>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ match */

function MatchPanel({
  ready,
  match,
  skills,
}: {
  ready: boolean;
  match: MatchResult | null;
  skills: string[];
}) {
  if (!ready || !match) {
    return (
      <section className="flex flex-col gap-2">
        <Eyebrow className="border-b border-rule pb-2.5">
          How you line up
        </Eyebrow>
        <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
          Add skills and target roles to your profile to see how this posting
          lines up with your experience.
        </p>
        <Button asChild size="sm" variant="ghost" className="self-start">
          <Link href="/profile#preferences">Complete your profile</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <Eyebrow className="border-b border-rule pb-2.5">How you line up</Eyebrow>

      {!match.eligible ? (
        <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
          Outside your stated preferences: {match.excludedBecause}.{" "}
          <Link
            href="/profile#preferences"
            className="text-cobalt-ink underline decoration-cobalt-soft underline-offset-4"
          >
            Preferences
          </Link>
        </p>
      ) : null}

      {match.roleFit ? (
        <p className="text-[0.875rem] text-ink">{match.roleFit}</p>
      ) : null}

      {match.strengths.length ? (
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Strong matches</p>
          <ul className="flex flex-col gap-1.5">
            {match.strengths.map((s) => (
              <li
                key={s.skill}
                className="text-[0.8125rem] leading-relaxed text-ink-muted"
              >
                <span className="mr-1.5 rounded-xs border border-lime-deep/40 bg-lime-tint px-1.5 py-0.5 text-[0.6875rem] text-[#4b6106]">
                  {s.skill}
                </span>
                {s.where.join(" · ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {match.relevant.length ? (
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Relevant experience</p>
          <ul className="flex flex-col gap-1.5">
            {match.relevant.map((r) => (
              <li
                key={r.label}
                className="text-[0.8125rem] leading-relaxed text-ink"
              >
                {r.label}
                {r.overlap.length ? (
                  <span className="text-ink-faint">
                    {" "}
                    — {r.overlap.join(", ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {match.gaps.length ? (
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Potential gaps</p>
          <ul className="flex flex-wrap gap-1.5">
            {match.gaps.map((gap) => (
              <li
                key={gap}
                className="rounded-xs border border-dashed border-rule-strong px-1.5 py-0.5 text-[0.6875rem] text-ink-faint"
              >
                {gap}
              </li>
            ))}
          </ul>
          <p className="text-[0.75rem] leading-relaxed text-ink-faint">
            Named in the posting, not on your profile. Add one only if it is
            genuinely true of you.
          </p>
        </div>
      ) : null}

      {skills.length === 0 ? (
        <p className="text-[0.75rem] leading-relaxed text-ink-faint">
          This posting names no specific skills ELARA recognises, so the
          comparison is limited.
        </p>
      ) : null}

      {match.notes.length ? (
        <ul className="flex flex-col gap-1 text-[0.75rem] text-ink-muted">
          {match.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function Meta({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="eyebrow shrink-0">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right [overflow-wrap:anywhere]",
          muted ? "text-ink-faint" : "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
