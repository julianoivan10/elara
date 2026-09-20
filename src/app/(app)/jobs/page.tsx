import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { requireUser } from "@/server/auth/guards";
import { CareerService } from "@/services/career.service";
import { JobService, jobFiltersSchema } from "@/services/job.service";
import { PageHeader, PageShell } from "@/features/workspace/page-header";
import { JobCard } from "@/features/jobs/job-card";
import { JobFilters } from "@/features/jobs/job-filters";

export const metadata: Metadata = { title: "Jobs" };
export const dynamic = "force-dynamic";

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

  const [{ jobs, total, page, pages }, skills, profile] = await Promise.all([
    JobService.search(filters, user.id),
    JobService.popularSkills(),
    CareerService.getProfile(user.id),
  ]);

  const matched = new Set(
    (profile?.skills ?? []).map((skill) => skill.name.toLowerCase().trim()),
  );

  return (
    <PageShell>
      <PageHeader
        index="03"
        label="Opportunities"
        title="Job discovery"
        description="Openings worth your time. Save the ones you want, and aim a resume at any of them."
        actions={
          <Button asChild variant="outline">
            <Link href="/saved">Saved jobs</Link>
          </Button>
        }
      />

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
        {/* ------------------------------------------------------ filters */}
        <aside className="lg:col-span-3">
          <div className="lg:sticky lg:top-8">
            <Suspense fallback={<div className="h-64" />}>
              <JobFilters skills={skills} total={total} />
            </Suspense>
          </div>
        </aside>

        {/* ------------------------------------------------------ results */}
        <div className="lg:col-span-9">
          <div className="hidden items-baseline justify-between gap-4 border-b border-rule pb-2.5 lg:flex">
            <p className="text-[0.8125rem] text-ink-muted">
              <span data-numeric className="font-mono text-ink">
                {total}
              </span>{" "}
              {total === 1 ? "opening" : "openings"}
              {filters.q ? (
                <>
                  {" matching "}
                  <span className="text-ink">“{filters.q}”</span>
                </>
              ) : null}
            </p>

            <SortLinks current={filters.sort} params={raw} />
          </div>

          {jobs.length === 0 ? (
            <EmptyState
              className="mt-8"
              icon={<Search />}
              title="Nothing matches those filters"
              description="Try removing a filter, or widening the location. New listings appear here as they are posted."
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
        </div>
      </div>
    </PageShell>
  );
}

/* ------------------------------------------------------------------ bits */

function withParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
  value: string,
) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && v) next.set(k, v);
  }
  next.set(key, value);
  return `/jobs?${next.toString()}`;
}

function SortLinks({
  current,
  params,
}: {
  current: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const options = [
    { value: "recent", label: "Newest" },
    { value: "salary", label: "Best paid" },
  ];

  return (
    <div className="flex items-center gap-3">
      <span className="eyebrow">Sort</span>
      {options.map((option) => (
        <Link
          key={option.value}
          href={withParam(params, "sort", option.value)}
          scroll={false}
          aria-current={current === option.value ? "true" : undefined}
          className={cn(
            "text-[0.75rem] transition-colors",
            current === option.value
              ? "text-ink underline underline-offset-4"
              : "text-ink-muted hover:text-ink",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
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
          <Link href={withParam(params, "page", String(page - 1))}>
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
          <Link href={withParam(params, "page", String(page + 1))}>Next</Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
