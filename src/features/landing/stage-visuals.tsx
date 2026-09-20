import { cn } from "@/lib/cn";
import {
  demoApplications,
  demoJobs,
  demoSkills,
} from "@/features/landing/demo-data";

/**
 * Five small drawings, one per stage of the workflow.
 *
 * They are built from the same type, rules and chips as the real product rather
 * than being screenshots or stock illustration, so the section shows the
 * interface's grammar instead of a picture of it.
 */

function Row({
  label,
  value,
  filled = true,
}: {
  label: string;
  value: string;
  filled?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule py-2 last:border-b-0">
      <span className="eyebrow shrink-0">{label}</span>
      {filled ? (
        <span className="truncate text-[0.8125rem] text-ink">{value}</span>
      ) : (
        <span className="text-[0.8125rem] text-ink-ghost">{value}</span>
      )}
    </div>
  );
}

export function ProfileVisual() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col">
        <Row label="Name" value="Amara Ilunga" />
        <Row label="Headline" value="Front-end engineer — design systems" />
        <Row label="Location" value="Lisbon, PT" />
        <Row label="Open to" value="Full time · Hybrid · Remote" />
      </div>

      <div className="flex flex-col gap-2">
        <span className="eyebrow">Skills</span>
        <div className="flex flex-wrap gap-1.5">
          {demoSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-xs border border-rule bg-raised px-1.5 py-0.5 text-[0.6875rem] text-ink-muted"
            >
              {skill}
            </span>
          ))}
          <span className="rounded-xs border border-dashed border-rule-strong px-1.5 py-0.5 text-[0.6875rem] text-ink-ghost">
            + add
          </span>
        </div>
      </div>
    </div>
  );
}

export function ResumeVisual() {
  return (
    <div className="flex gap-5">
      <ul className="hidden w-28 shrink-0 flex-col gap-0.5 sm:flex">
        {["Header", "Summary", "Experience", "Projects", "Skills"].map(
          (item, i) => (
            <li
              key={item}
              className={cn(
                "flex items-center gap-2 rounded-sm px-2 py-1.5 text-[0.75rem]",
                i === 2 ? "bg-ink text-paper" : "text-ink-muted",
              )}
            >
              <span
                data-numeric
                className={cn(
                  "font-mono text-[0.625rem]",
                  i === 2 ? "text-paper/60" : "text-ink-ghost",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {item}
            </li>
          ),
        )}
      </ul>

      <div className="flex-1 rounded-[3px] border border-rule bg-surface p-4 shadow-(--shadow-paper)">
        <p className="text-[0.9375rem] font-medium tracking-[-0.02em] text-ink">
          Amara Ilunga
        </p>
        <p className="mt-0.5 text-[0.6875rem] text-ink-muted">
          Front-end engineer — design systems
        </p>
        <div className="my-3 h-px bg-rule-strong" />
        <p className="eyebrow mb-1.5">Experience</p>
        <div className="flex flex-col gap-2">
          {[
            { role: "Front-end engineer · Norwind", period: "2023 —" },
            { role: "Junior developer · Caldera Studio", period: "2021 — 23" },
          ].map((item) => (
            <div key={item.role} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[0.75rem] font-medium text-ink">
                  {item.role}
                </span>
                <span
                  data-numeric
                  className="font-mono text-[0.625rem] text-ink-faint"
                >
                  {item.period}
                </span>
              </div>
              <span className="h-1 w-full rounded-full bg-sunk" />
              <span className="h-1 w-[78%] rounded-full bg-sunk" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function JobsVisual() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {["Remote", "Full time", "TypeScript", "€50k+"].map((filter, i) => (
          <span
            key={filter}
            className={cn(
              "rounded-xs border px-1.5 py-0.5 text-[0.6875rem]",
              i === 0
                ? "border-ink bg-ink text-paper"
                : "border-rule bg-surface text-ink-muted",
            )}
          >
            {filter}
          </span>
        ))}
      </div>

      <div className="flex flex-col">
        {demoJobs.map((job) => (
          <div
            key={job.title}
            className="flex items-start justify-between gap-4 border-t border-rule py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] font-medium text-ink">
                {job.title}
              </p>
              <p className="eyebrow mt-1">
                {job.company} · {job.locationType} · {job.location}
              </p>
            </div>
            <span
              data-numeric
              className="shrink-0 font-mono text-[0.6875rem] text-ink-faint"
            >
              {job.salary}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TailorVisual() {
  const asks = [
    { label: "TypeScript", have: true },
    { label: "Design systems", have: true },
    { label: "Accessibility", have: true },
    { label: "Storybook", have: false },
    { label: "GraphQL", have: false },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="eyebrow">What the posting asks for</span>
        <div className="flex flex-wrap gap-1.5">
          {asks.map((ask) => (
            <span
              key={ask.label}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xs border px-1.5 py-0.5 text-[0.6875rem]",
                ask.have
                  ? "border-lime-deep/40 bg-lime-tint text-[#4b6106]"
                  : "border-dashed border-rule-strong bg-surface text-ink-faint",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1 rounded-full",
                  ask.have ? "bg-lime-deep" : "bg-ink-ghost",
                )}
              />
              {ask.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-rule pt-4">
        <span className="eyebrow">Your wording, sharpened</span>
        <p className="text-[0.8125rem] leading-relaxed text-ink">
          Rebuilt the shared component library{" "}
          <span className="marker">adopted by four product teams</span>, and
          wrote the migration guide they shipped against.
        </p>
        <p className="text-[0.6875rem] leading-relaxed text-ink-faint">
          Every fact here came from your profile. ELARA rewrites wording, never
          the record.
        </p>
      </div>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  Applied: "border-cobalt-soft bg-cobalt-tint text-cobalt-ink",
  Screening: "border-info/25 bg-info-tint text-info",
  Interview: "border-lime-deep/40 bg-lime-tint text-[#4b6106]",
  Offer: "border-success/25 bg-success-tint text-success",
};

export function ApplicationsVisual() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {demoApplications.map((app) => (
        <div key={app.company} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-1">
            <span
              className={cn(
                "rounded-xs border px-1.5 py-0.5 text-[0.625rem] font-medium",
                STATUS_TONE[app.status],
              )}
            >
              {app.status}
            </span>
          </div>
          <div className="rounded-sm border border-rule bg-surface p-2.5">
            <p className="text-[0.75rem] font-medium leading-tight text-ink">
              {app.company}
            </p>
            <p className="mt-1 text-[0.6875rem] leading-tight text-ink-muted">
              {app.role}
            </p>
            <p className="eyebrow mt-2">{app.when}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export const STAGE_VISUALS: Record<string, () => React.JSX.Element> = {
  profile: ProfileVisual,
  resume: ResumeVisual,
  jobs: JobsVisual,
  tailor: TailorVisual,
  applications: ApplicationsVisual,
};
