import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  CalendarClock,
  FileText,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { fullDate, humanizeEnum, monthYear, relativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { Eyebrow } from "@/components/ui/editorial";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { CareerService } from "@/services/career.service";
import { computeCompletion } from "@/lib/completion";
import { ResumeService } from "@/services/resume.service";
import { ApplicationService } from "@/services/application.service";
import { getTemplate } from "@/features/resume/templates";
import { PageHeader, PageShell } from "@/features/workspace/page-header";
import { CompletionPanel } from "@/features/dashboard/completion-panel";

export const metadata: Metadata = { title: "Dashboard" };

/** Session-scoped data, so this route is rendered per request. */
export const dynamic = "force-dynamic";

const STATUS_TONE = {
  SAVED: "neutral",
  PREPARED: "outline",
  APPLIED: "cobalt",
  SCREENING: "info",
  ASSESSMENT: "warning",
  INTERVIEW: "lime",
  OFFER: "success",
  REJECTED: "danger",
} as const;

export default async function DashboardPage() {
  const user = await requireUser();

  const [profile, resumes, stats, activity, savedJobs, upcoming] =
    await Promise.all([
      CareerService.getProfile(user.id),
      ResumeService.list(user.id),
      ApplicationService.stats(user.id),
      ApplicationService.recentActivity(user.id, 6),
      db.savedJob.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 4,
        include: {
          job: {
            select: { id: true, title: true, company: true, location: true },
          },
        },
      }),
      db.application.findMany({
        where: { userId: user.id, nextEventAt: { gte: new Date() } },
        orderBy: { nextEventAt: "asc" },
        take: 3,
        select: {
          id: true,
          company: true,
          role: true,
          nextEventAt: true,
          nextEventLabel: true,
        },
      }),
    ]);

  const completion = computeCompletion(profile);
  const firstName = user.name.split(" ")[0];

  return (
    <PageShell>
      <PageHeader
        index="00"
        label="Workspace"
        title={`Good to see you, ${firstName}.`}
        description={
          stats.active > 0
            ? `${stats.active} application${stats.active === 1 ? "" : "s"} in progress, and ${savedJobs.length} role${savedJobs.length === 1 ? "" : "s"} kept for later.`
            : "Nothing in progress yet. Build out your profile, then find a role worth applying to."
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/jobs">Find jobs</Link>
            </Button>
            <Button asChild>
              <Link href="/resume">
                <Plus />
                New resume
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
        {/* ------------------------------------------------------- main */}
        <div className="flex min-w-0 flex-col gap-12 lg:col-span-7 xl:col-span-8">
          <CompletionPanel completion={completion} />

          {/* ------------------------------------------- pipeline */}
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-2.5">
              <Eyebrow>Pipeline</Eyebrow>
              <Link
                href="/applications"
                className="group inline-flex items-center gap-1 text-[0.75rem] text-ink-muted transition-colors hover:text-ink"
              >
                Open the tracker
                <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>

            {stats.total === 0 ? (
              <EmptyState
                icon={<Bookmark />}
                title="No applications yet"
                description="Save a job you are interested in and it will appear here with its stage."
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link href="/jobs">Browse openings</Link>
                  </Button>
                }
              />
            ) : (
              <div className="flex flex-col gap-5">
                <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-rule bg-rule">
                  {[
                    { label: "In progress", value: stats.active },
                    { label: "At interview", value: stats.interviews },
                    { label: "Offers", value: stats.offers },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-surface px-4 py-3.5">
                      <dt className="eyebrow">{stat.label}</dt>
                      <dd
                        data-numeric
                        className="mt-1.5 font-mono text-[1.75rem] leading-none tracking-[-0.04em] text-ink"
                      >
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {upcoming.length > 0 ? (
                  <ul className="flex flex-col">
                    {upcoming.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 border-b border-rule py-3 last:border-b-0"
                      >
                        <CalendarClock className="size-3.5 shrink-0 text-cobalt" />
                        <span className="min-w-0 flex-1 truncate text-[0.875rem] text-ink">
                          <span className="font-medium">
                            {item.nextEventLabel ?? "Next step"}
                          </span>
                          <span className="text-ink-muted">
                            {" — "}
                            {item.company}
                          </span>
                        </span>
                        <time
                          dateTime={item.nextEventAt?.toISOString()}
                          className="shrink-0 font-mono text-[0.6875rem] text-ink-faint"
                        >
                          {fullDate(item.nextEventAt)}
                        </time>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </section>

          {/* ------------------------------------------- activity */}
          {activity.length > 0 ? (
            <section className="flex flex-col gap-4">
              <Eyebrow className="border-b border-rule pb-2.5">
                Recent activity
              </Eyebrow>

              {/* A timeline, not another card grid. */}
              <ol className="relative flex flex-col gap-4 pl-4">
                <span
                  aria-hidden
                  className="absolute inset-y-1 left-0 w-px bg-rule"
                />
                {activity.map((event) => (
                  <li
                    key={event.id}
                    className="relative flex items-baseline gap-3"
                  >
                    <span
                      aria-hidden
                      className="absolute -left-4 top-1.5 size-1.5 rounded-full bg-rule-strong ring-4 ring-paper"
                    />
                    <span className="min-w-0 flex-1 text-[0.875rem] text-ink-muted">
                      <Link
                        href={`/applications?open=${event.application.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {event.application.company}
                      </Link>{" "}
                      moved to{" "}
                      <Badge tone={STATUS_TONE[event.toStatus]}>
                        {humanizeEnum(event.toStatus)}
                      </Badge>
                    </span>
                    <time
                      dateTime={event.createdAt.toISOString()}
                      className="shrink-0 font-mono text-[0.6875rem] text-ink-faint"
                    >
                      {relativeTime(event.createdAt)}
                    </time>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>

        {/* ------------------------------------------------------ aside */}
        <div className="flex min-w-0 flex-col gap-10 lg:col-span-5 xl:col-span-4">
          {/* ------------------------------------------- resumes */}
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-2.5">
              <Eyebrow>Resumes</Eyebrow>
              <Link
                href="/resume"
                className="text-[0.75rem] text-ink-muted transition-colors hover:text-ink"
              >
                All {resumes.length > 0 ? `(${resumes.length})` : ""}
              </Link>
            </div>

            {resumes.length === 0 ? (
              <EmptyState
                icon={<FileText />}
                title="No resumes yet"
                description="Your profile becomes a resume in one step. You can keep several, each aimed at a different kind of role."
                action={
                  <Button asChild size="sm">
                    <Link href="/resume">Create a resume</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col">
                {resumes.slice(0, 3).map((resume) => (
                  <li
                    key={resume.id}
                    className="border-b border-rule last:border-b-0"
                  >
                    <Link
                      href={`/resume/${resume.id}`}
                      className="group flex items-start gap-3 py-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.875rem] font-medium text-ink">
                          {resume.title}
                        </span>
                        <span className="eyebrow mt-1 block">
                          {getTemplate(resume.templateKey).name} · edited{" "}
                          {relativeTime(resume.updatedAt)}
                        </span>
                      </span>
                      <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-ink-ghost transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* --------------------------------------- saved jobs */}
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-2.5">
              <Eyebrow>Saved</Eyebrow>
              <Link
                href="/saved"
                className="text-[0.75rem] text-ink-muted transition-colors hover:text-ink"
              >
                All
              </Link>
            </div>

            {savedJobs.length === 0 ? (
              <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
                Nothing saved yet. Keep a role from{" "}
                <Link
                  href="/jobs"
                  className="text-cobalt-ink underline decoration-cobalt-soft underline-offset-4"
                >
                  job discovery
                </Link>{" "}
                and it will wait here.
              </p>
            ) : (
              <ul className="flex flex-col">
                {savedJobs.map(({ job, createdAt }) => (
                  <li
                    key={job.id}
                    className="border-b border-rule last:border-b-0"
                  >
                    <Link href={`/jobs/${job.id}`} className="group block py-3">
                      <span className="block truncate text-[0.875rem] font-medium text-ink">
                        {job.title}
                      </span>
                      <span className="eyebrow mt-1 block">
                        {job.company} · {job.location}
                      </span>
                      <span className="eyebrow mt-1 block text-ink-ghost">
                        Saved {relativeTime(createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ------------------------------------------ profile */}
          <section
            className={cn(
              "rounded-lg border border-rule bg-raised/60 p-5",
              "flex flex-col gap-3",
            )}
          >
            <Eyebrow>Your profile</Eyebrow>
            <p className="text-[0.875rem] leading-relaxed text-ink">
              {profile?.headline ? (
                profile.headline
              ) : (
                <span className="text-ink-muted">
                  Add a headline so recruiters and resumes both have one line
                  that says what you do.
                </span>
              )}
            </p>
            <dl className="grid grid-cols-3 gap-3 border-t border-rule pt-3">
              {[
                { label: "Roles", value: profile?.experience.length ?? 0 },
                { label: "Projects", value: profile?.projects.length ?? 0 },
                { label: "Skills", value: profile?.skills.length ?? 0 },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="eyebrow">{item.label}</dt>
                  <dd
                    data-numeric
                    className="mt-1 font-mono text-[1.125rem] leading-none text-ink"
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-1 self-start"
            >
              <Link href="/profile">Edit your profile</Link>
            </Button>
            {profile?.updatedAt ? (
              <p className="eyebrow">Updated {monthYear(profile.updatedAt)}</p>
            ) : null}
          </section>
        </div>
      </div>
    </PageShell>
  );
}
