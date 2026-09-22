import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Radar, Search } from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/editorial";
import { EmptyState } from "@/components/ui/panel";
import { requireUser } from "@/server/auth/guards";
import { CareerService } from "@/services/career.service";
import { AiService } from "@/services/ai.service";
import { MatchService } from "@/services/match.service";
import {
  JobService,
  hasActiveFilters,
  jobFiltersSchema,
} from "@/services/job.service";
import { PageHeader, PageShell } from "@/features/workspace/page-header";
import { JobCard } from "@/features/jobs/job-card";
import { JobFilters } from "@/features/jobs/job-filters";
import { MatchReview } from "@/features/jobs/match-review";

export const metadata: Metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";
/** Covers the match-review server action on this page. */
export const maxDuration = 60;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const raw = await searchParams;

  // `.catch()` on each field means a hand-edited URL degrades to the default
  // rather than throwing.
  const filters = jobFiltersSchema.parse(raw);
  const filtered = hasActiveFilters(filters);

  const [{ jobs, total, page, pages }, facets, profileSkills] =
    await Promise.all([
      JobService.search(filters, user.id),
      JobService.facets(),
      CareerService.getSkillNames(user.id),
    ]);

  const matched = new Set(
    profileSkills.map((skill) => skill.toLowerCase().trim()),
  );

  return (
    <PageShell>
      <PageHeader
        index="03"
        label="Opportunities"
        title="Job discovery"
        description="Live openings from companies' own job boards, read against your profile. Every listing links to the official application."
        actions={
          <Button asChild variant="outline">
            <Link href="/saved">Saved jobs</Link>
          </Button>
        }
      />

      {facets.liveTotal === 0 ? (
        // Never a fallback to sample listings: say plainly that there is
        // nothing live, and why that can happen.
        <EmptyState
          icon={<Radar />}
          title="No live job sources are currently available."
          description="ELARA only shows real postings from companies' official job boards. None have been synced yet, or every source is temporarily unreachable. Listings appear here after the next sync."
        />
      ) : (
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
          {/* ------------------------------------------------------ filters */}
          <aside className="min-w-0 lg:col-span-3">
            <div className="lg:sticky lg:top-8">
              <Suspense fallback={<div className="h-64" />}>
                <JobFilters
                  skills={facets.skills}
                  sources={facets.sources}
                  currencies={facets.currencies}
                  total={total}
                />
              </Suspense>
            </div>
          </aside>

          {/* ------------------------------------------------------ results */}
          <div className="flex min-w-0 flex-col gap-12 lg:col-span-9">
            {page === 1 && !filtered ? (
              <Suspense fallback={<RecommendedSkeleton />}>
                <Recommended
                  userId={user.id}
                  aiEnabled={AiService.configured}
                />
              </Suspense>
            ) : null}

            <section className="flex flex-col">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-rule pb-2.5">
                <p className="text-[0.8125rem] text-ink-muted">
                  <span data-numeric className="font-mono text-ink">
                    {total}
                  </span>{" "}
                  {total === 1 ? "live opening" : "live openings"}
                  {filters.q ? (
                    <>
                      {" matching "}
                      <span className="text-ink">“{filters.q}”</span>
                    </>
                  ) : null}
                </p>

                <SortLinks
                  current={filters.sort}
                  params={raw}
                  canSortByPay={Boolean(filters.currency)}
                />
              </div>

              {jobs.length === 0 ? (
                <EmptyState
                  className="mt-8"
                  icon={<Search />}
                  title="Nothing matches those filters"
                  description="Try removing a filter or widening the location. New listings arrive with each sync."
                  action={
                    <Button asChild size="sm" variant="outline">
                      <Link href="/jobs">Clear everything</Link>
                    </Button>
                  }
                />
              ) : (
                <>
                  <div className="flex flex-col">
                    {jobs.map((job) => (
                      <JobCard key={job.id} job={job} matchedSkills={matched} />
                    ))}
                  </div>

                  {pages > 1 ? (
                    <Pagination page={page} pages={pages} params={raw} />
                  ) : null}
                </>
              )}
            </section>
          </div>
        </div>
      )}
    </PageShell>
  );
}

/* ----------------------------------------------------------- recommended */

async function Recommended({
  userId,
  aiEnabled,
}: {
  userId: string;
  aiEnabled: boolean;
}) {
  const { ready, items } = await MatchService.recommend(userId, 5);

  return (
    <section className="flex flex-col">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-ink pb-2.5">
        <Eyebrow>Recommended for you</Eyebrow>
        <span className="text-[0.75rem] text-ink-faint">
          Matched on the skills and roles in your profile
        </span>
      </div>

      {!ready ? (
        <p className="mt-5 max-w-[60ch] text-[0.875rem] leading-relaxed text-ink-muted">
          Add your skills and the roles you are aiming for, and ELARA will pick
          out the openings that fit — and say why.{" "}
          <Link
            href="/profile#preferences"
            className="text-cobalt-ink underline decoration-cobalt-soft underline-offset-4"
          >
            Set your job preferences
          </Link>
        </p>
      ) : items.length === 0 ? (
        <p className="mt-5 max-w-[60ch] text-[0.875rem] leading-relaxed text-ink-muted">
          Nothing live lines up with your profile and preferences right now. The
          list below has everything; new listings arrive with each sync.
        </p>
      ) : (
        <>
          <div className="flex flex-col">
            {items.map(({ job, match }) => (
              <JobCard
                key={job.id}
                job={job}
                match={{
                  roleFit: match.roleFit,
                  strengths: match.strengths.map((s) => s.skill),
                  gaps: match.gaps,
                }}
              />
            ))}
          </div>
          {aiEnabled ? (
            <MatchReview
              jobs={items.map((i) => ({
                id: i.job.id,
                title: i.job.title,
                company: i.job.company,
              }))}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

function RecommendedSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="h-3 w-40 rounded-full bg-sunk" />
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="mt-5 flex flex-col gap-2 border-t border-rule pt-5"
        >
          <div className="h-3.5 w-64 max-w-full rounded-full bg-sunk" />
          <div className="h-3 w-48 rounded-full bg-raised" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ bits */

function withParams(
  params: Record<string, string | string[] | undefined>,
  changes: Record<string, string | null>,
) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && v) next.set(k, v);
  }
  for (const [k, v] of Object.entries(changes)) {
    if (v === null) next.delete(k);
    else next.set(k, v);
  }
  return `/jobs?${next.toString()}`;
}

function SortLinks({
  current,
  params,
  canSortByPay,
}: {
  current: string;
  params: Record<string, string | string[] | undefined>;
  canSortByPay: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="eyebrow">Sort</span>
      <SortLink
        href={withParams(params, { sort: "recent", page: null })}
        active={current !== "salary" || !canSortByPay}
      >
        Newest
      </SortLink>
      {canSortByPay ? (
        <SortLink
          href={withParams(params, { sort: "salary", page: null })}
          active={current === "salary"}
        >
          Best paid
        </SortLink>
      ) : (
        <span
          className="text-[0.75rem] text-ink-ghost"
          title="Choose a currency under Pay to sort by pay"
        >
          Best paid
        </span>
      )}
    </div>
  );
}

function SortLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "text-[0.75rem] transition-colors",
        active
          ? "text-ink underline underline-offset-4"
          : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

function Pagination({
  page,
  pages,
  params,
}: {
  page: number;
  pages: number;
  params: Record<string, string | string[] | undefined>;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-between gap-4 border-t border-rule pt-5"
    >
      {page > 1 ? (
        <Button asChild variant="outline" size="sm">
          <Link href={withParams(params, { page: String(page - 1) })}>
            Previous
          </Link>
        </Button>
      ) : (
        <span />
      )}

      <p className="eyebrow" data-numeric>
        Page {page} of {pages}
      </p>

      {page < pages ? (
        <Button asChild variant="outline" size="sm">
          <Link href={withParams(params, { page: String(page + 1) })}>
            Next
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
