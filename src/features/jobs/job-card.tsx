"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, MapPin } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/cn";
import { humanizeEnum, postedLabel, salaryRange } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { toggleSavedJobAction } from "@/server/actions/job.actions";

export type JobSummary = {
  id: string;
  title: string;
  company: string;
  location: string;
  locationType: string;
  employmentType: string;
  seniority: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: "HOUR" | "MONTH" | "YEAR" | null;
  summary: string;
  skills: string[];
  postedAt: Date;
  saved: boolean;
};

/**
 * A job in the list.
 *
 * ELARA's own hierarchy: the role first, then who and where, then what it pays,
 * then what it asks for. Skills the person already has are marked, because that
 * is the question someone is actually asking while scanning.
 */
export function JobCard({
  job,
  matchedSkills,
}: {
  job: JobSummary;
  /** Lower-cased skill names from the viewer's profile. */
  matchedSkills?: Set<string>;
}) {
  const salary = salaryRange(job);

  return (
    <article className="group relative flex items-start gap-4 border-t border-rule py-5 last:border-b">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-[1.0625rem] font-medium tracking-[-0.015em] text-ink">
            {/* The whole row is clickable via this overlay, but the link itself
                is what a screen reader and the keyboard get. */}
            <Link
              href={`/jobs/${job.id}`}
              className="hover:underline underline-offset-4"
            >
              <span className="absolute inset-0 z-0" aria-hidden />
              {job.title}
            </Link>
          </h3>

          {salary ? (
            <span
              data-numeric
              className="shrink-0 font-mono text-[0.8125rem] text-ink"
            >
              {salary}
            </span>
          ) : null}
        </div>

        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-ink-muted">
          <span className="font-medium text-ink">{job.company}</span>
          <Sep />
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3 text-ink-ghost" />
            {job.location}
          </span>
          <Sep />
          <span>{humanizeEnum(job.locationType)}</span>
          <Sep />
          <span>{humanizeEnum(job.employmentType)}</span>
        </p>

        <p className="mt-2.5 max-w-[68ch] text-[0.875rem] leading-relaxed text-ink-muted">
          {job.summary}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {job.skills.slice(0, 6).map((skill) => {
            const have = matchedSkills?.has(skill.toLowerCase().trim());
            return (
              <span
                key={skill}
                className={cn(
                  "rounded-xs border px-1.5 py-0.5 text-[0.6875rem]",
                  have
                    ? "border-lime-deep/40 bg-lime-tint text-[#4b6106]"
                    : "border-rule bg-surface text-ink-muted",
                )}
                title={have ? "On your profile" : undefined}
              >
                {skill}
              </span>
            );
          })}

          <span className="eyebrow ml-auto shrink-0">
            {postedLabel(job.postedAt)}
          </span>
        </div>
      </div>

      <SaveButton jobId={job.id} title={job.title} initialSaved={job.saved} />
    </article>
  );
}

function Sep() {
  return (
    <span aria-hidden className="text-ink-ghost">
      ·
    </span>
  );
}

/**
 * The save toggle.
 *
 * Optimistic, so the state flips the moment it is pressed, and the bookmark
 * gets a small scale kick on the way in — the one place in job discovery where
 * a flourish is warranted, because saving is the action worth encouraging.
 */
export function SaveButton({
  jobId,
  title,
  initialSaved,
  withLabel = false,
}: {
  jobId: string;
  title: string;
  initialSaved: boolean;
  withLabel?: boolean;
}) {
  const [saved, setSaved] = React.useState(initialSaved);
  const [serverValue, setServerValue] = React.useState(initialSaved);
  const [pending, startTransition] = React.useTransition();
  const { toast } = useToast();
  const reduced = useReducedMotion();

  // Adjusting state during render when a prop changes, which is the supported
  // way to reconcile optimistic state with a revalidated server value.
  if (serverValue !== initialSaved) {
    setServerValue(initialSaved);
    setSaved(initialSaved);
  }

  const toggle = () => {
    const next = !saved;
    setSaved(next);

    startTransition(async () => {
      const result = await toggleSavedJobAction(jobId);
      if (result.status === "error") {
        setSaved(!next);
        toast(result.message ?? "Could not save that.", { tone: "error" });
      } else if (typeof result.saved === "boolean") {
        setSaved(result.saved);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      className={cn(
        "relative z-10 flex shrink-0 items-center gap-2 rounded-sm border px-2 text-[0.8125rem] transition-colors duration-200",
        withLabel ? "h-9 px-3" : "size-9 justify-center",
        saved
          ? "border-ink bg-ink text-paper"
          : "border-rule bg-surface text-ink-faint hover:border-ink hover:text-ink",
      )}
    >
      <motion.span
        key={String(saved)}
        initial={reduced ? false : { scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 18 }}
        className="flex"
      >
        <Bookmark className={cn("size-3.5", saved && "fill-current")} />
      </motion.span>
      {withLabel ? <span>{saved ? "Saved" : "Save"}</span> : null}
    </button>
  );
}
