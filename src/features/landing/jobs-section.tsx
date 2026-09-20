import { Bookmark, MapPin } from "lucide-react";

import { cn } from "@/lib/cn";
import { SectionHeading } from "@/components/ui/editorial";
import { demoJobs } from "@/features/landing/demo-data";

/**
 * Discovery and tracking share one section, because in ELARA they share one
 * motion: a job you keep becomes a row on the board. Showing them apart would
 * be two screenshots; showing them together is the product.
 */
const COLUMNS = [
  {
    status: "Applied",
    tone: "border-cobalt-soft bg-cobalt-tint text-cobalt-ink",
    items: [{ company: "Norwind", role: "Front-end engineer", meta: "3d ago" }],
  },
  {
    status: "Screening",
    tone: "border-info/25 bg-info-tint text-info",
    items: [
      { company: "Halden Labs", role: "Product engineer", meta: "Call Tue" },
    ],
  },
  {
    status: "Interview",
    tone: "border-lime-deep/40 bg-lime-tint text-[#4b6106]",
    items: [{ company: "Marrow", role: "UI engineer", meta: "Thu 14:00" }],
  },
  {
    status: "Offer",
    tone: "border-success/25 bg-success-tint text-success",
    items: [
      {
        company: "Pell & Co",
        role: "Front-end developer",
        meta: "Reply by Fri",
      },
    ],
  },
];

export function JobsSection() {
  return (
    <section
      id="jobs"
      className="scroll-mt-20 border-t border-rule bg-raised/60 py-20 md:py-28"
    >
      <div className="gutter mx-auto max-w-[90rem]">
        <SectionHeading
          index="05"
          label="Opportunities"
          title="Keep a role. Then keep track of it."
          description="Search openings, save the ones worth your time, and aim a resume at any of them. Anything you apply to appears on the board with its stage and what happens next."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* --------------------------------------------------- listings */}
          <div className="min-w-0 lg:col-span-6">
            <span className="eyebrow">Discovery</span>
            <ul className="mt-4 flex flex-col">
              {demoJobs.map((job) => (
                <li
                  key={job.title}
                  className="group flex items-start gap-4 border-t border-rule py-4 last:border-b"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="truncate text-[1rem] font-medium tracking-[-0.015em] text-ink">
                        {job.title}
                      </h3>
                      <span
                        data-numeric
                        className="shrink-0 font-mono text-[0.75rem] text-ink"
                      >
                        {job.salary}
                      </span>
                    </div>

                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-ink-muted">
                      <span className="font-medium text-ink">
                        {job.company}
                      </span>
                      <span aria-hidden className="text-ink-ghost">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3 text-ink-ghost" />
                        {job.location}
                      </span>
                      <span aria-hidden className="text-ink-ghost">
                        ·
                      </span>
                      <span>{job.locationType}</span>
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {job.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-xs border border-rule bg-surface px-1.5 py-0.5 text-[0.6875rem] text-ink-muted"
                        >
                          {skill}
                        </span>
                      ))}
                      <span className="eyebrow ml-auto">{job.posted}</span>
                    </div>
                  </div>

                  <span
                    aria-hidden
                    className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-sm border border-rule bg-surface text-ink-faint transition-colors duration-200 group-hover:border-ink group-hover:text-ink"
                  >
                    <Bookmark className="size-3.5" />
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ----------------------------------------------------- board */}
          <div className="min-w-0 lg:col-span-6">
            <span className="eyebrow">Applications</span>

            <div className="scrollbar-none mt-4 -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
              {COLUMNS.map((column) => (
                <div key={column.status} className="w-[10.5rem] shrink-0">
                  <div className="flex items-center justify-between gap-2 pb-2.5">
                    <span
                      className={cn(
                        "rounded-xs border px-1.5 py-0.5 text-[0.6875rem] font-medium",
                        column.tone,
                      )}
                    >
                      {column.status}
                    </span>
                    <span
                      data-numeric
                      className="font-mono text-[0.6875rem] text-ink-ghost"
                    >
                      {column.items.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-rule pt-2.5">
                    {column.items.map((item) => (
                      <article
                        key={item.company}
                        className="rounded-sm border border-rule bg-surface p-3"
                      >
                        <p className="text-[0.8125rem] font-medium leading-tight text-ink">
                          {item.company}
                        </p>
                        <p className="mt-1 text-[0.75rem] leading-tight text-ink-muted">
                          {item.role}
                        </p>
                        <p className="eyebrow mt-2.5">{item.meta}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 border-t border-rule pt-5 text-[0.8125rem] leading-relaxed text-ink-muted">
              On a phone the board becomes a single ordered list, because a
              horizontal kanban on a 390px screen is a worse way to read your
              own search.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
