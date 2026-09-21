import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, MapPin } from "lucide-react";

import { cn } from "@/lib/cn";
import { fullDate, humanizeEnum, postedLabel, salaryRange } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/editorial";
import { ProgressRule } from "@/components/ui/meter";
import { requireUser } from "@/server/auth/guards";
import { CareerService } from "@/services/career.service";
import { JobService } from "@/services/job.service";
import { skillMatch } from "@/lib/skill-match";
import { AiService } from "@/services/ai.service";
import { PageShell } from "@/features/workspace/page-header";
import { SaveButton } from "@/features/jobs/job-card";
import { JobActions } from "@/features/jobs/job-actions";
import { JobAnalysis } from "@/features/ai/job-analysis";

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

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [job, profile] = await Promise.all([
    JobService.get(id, user.id),
    CareerService.getProfile(user.id),
  ]);

  if (!job) notFound();

  const match = skillMatch(
    job.skills,
    (profile?.skills ?? []).map((skill) => skill.name),
  );

  const salary = salaryRange(job);

  return (
    <PageShell>
      <Link
        href="/jobs"
        className="group mb-6 inline-flex items-center gap-2 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
        All openings
      </Link>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
        {/* ------------------------------------------------------ posting */}
        <div className="min-w-0 lg:col-span-8">
          <header className="border-b border-ink pb-6">
            <Eyebrow>{job.company}</Eyebrow>

            <h1 className="mt-3 text-[clamp(1.5rem,1.2rem+1.4vw,2.125rem)] leading-[1.08] tracking-[-0.03em] text-ink">
              {job.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.8125rem] text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-ink-ghost" />
                {job.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="size-3.5 text-ink-ghost" />
                {humanizeEnum(job.locationType)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-ink-ghost" />
                Posted {postedLabel(job.postedAt).toLowerCase()}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <Badge tone="ink">{humanizeEnum(job.employmentType)}</Badge>
              <Badge tone="outline">{humanizeEnum(job.seniority)} level</Badge>
              {salary ? <Badge tone="cobalt">{salary}</Badge> : null}
              {job.isDemo ? (
                <Badge
                  tone="warning"
                  title="Part of the sample catalogue that ships with ELARA"
                >
                  Demo listing
                </Badge>
              ) : null}
            </div>
          </header>

          <p className="mt-6 text-lead text-ink">{job.summary}</p>

          <div className="mt-8 flex flex-col gap-8">
            <Prose label="About the role" body={job.description} />

            <ListBlock label="What you would do" items={job.responsibilities} />
            <ListBlock label="What they ask for" items={job.requirements} />
            <ListBlock label="What is on offer" items={job.benefits} />
          </div>
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
                applyUrl={job.applyUrl}
                alreadyTracked={Boolean(job.application)}
              />

              {job.application ? (
                <p className="border-t border-rule pt-3 text-[0.75rem] text-ink-muted">
                  Tracked as{" "}
                  <Link
                    href="/applications"
                    className="text-cobalt-ink underline decoration-cobalt-soft underline-offset-4"
                  >
                    {humanizeEnum(job.application.status)}
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            {AiService.configured ? <JobAnalysis jobId={job.id} /> : null}

            {/* ------------------------------------------- skill match */}
            {job.skills.length > 0 ? (
              <section className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-2.5">
                  <Eyebrow>How you line up</Eyebrow>
                  <span
                    data-numeric
                    className="font-mono text-[0.8125rem] text-ink"
                  >
                    {match.matched.length}/{job.skills.length}
                  </span>
                </div>

                <ProgressRule value={match.percent} tone="lime" />

                <ul className="flex flex-wrap gap-1.5 pt-1">
                  {job.skills.map((skill) => {
                    const have = match.matched.includes(skill);
                    return (
                      <li
                        key={skill}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-xs border px-1.5 py-0.5 text-[0.6875rem]",
                          have
                            ? "border-lime-deep/40 bg-lime-tint text-[#4b6106]"
                            : "border-dashed border-rule-strong text-ink-faint",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "size-1 rounded-full",
                            have ? "bg-lime-deep" : "bg-ink-ghost",
                          )}
                        />
                        {skill}
                      </li>
                    );
                  })}
                </ul>

                <p className="text-[0.75rem] leading-relaxed text-ink-faint">
                  {match.missing.length === 0
                    ? "Everything this posting names is already on your profile."
                    : `Dashed items are not on your profile yet. Add one only if it is genuinely true of you.`}
                </p>

                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="self-start"
                >
                  <Link href="/profile#skills">Edit your skills</Link>
                </Button>
              </section>
            ) : null}

            <dl className="flex flex-col gap-3 border-t border-rule pt-5 text-[0.8125rem]">
              <Meta label="Company" value={job.company} />
              <Meta label="Location" value={job.location} />
              <Meta label="Contract" value={humanizeEnum(job.employmentType)} />
              <Meta label="Level" value={`${humanizeEnum(job.seniority)}`} />
              {salary ? <Meta label="Pay" value={salary} /> : null}
              <Meta label="Posted" value={fullDate(job.postedAt) ?? ""} />
              {job.expiresAt ? (
                <Meta label="Closes" value={fullDate(job.expiresAt) ?? ""} />
              ) : null}
            </dl>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="eyebrow shrink-0">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}

function Prose({ label, body }: { label: string; body: string }) {
  return (
    <section className="flex flex-col gap-3">
      <Eyebrow className="border-b border-rule pb-2.5">{label}</Eyebrow>
      {body.split("\n\n").map((paragraph, i) => (
        <p
          key={i}
          className="max-w-[68ch] text-[0.9375rem] leading-relaxed text-ink-muted"
        >
          {paragraph}
        </p>
      ))}
    </section>
  );
}

function ListBlock({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <Eyebrow className="border-b border-rule pb-2.5">{label}</Eyebrow>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-3 text-[0.9375rem] leading-relaxed text-ink-muted"
          >
            <span
              data-numeric
              aria-hidden
              className="shrink-0 pt-0.5 font-mono text-[0.6875rem] text-ink-ghost"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="max-w-[64ch]">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
