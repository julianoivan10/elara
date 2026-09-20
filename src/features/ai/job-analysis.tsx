"use client";

import * as React from "react";
import { LoaderCircle, Wand } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/editorial";
import { analyzeJobAction } from "@/server/actions/ai.actions";

type Analysis = {
  reading: string;
  mustHaves: string[];
  niceToHaves: string[];
  strengths: string[];
  gaps: string[];
  talkingPoints: string[];
};

/**
 * "What this posting is actually asking for."
 *
 * Deliberately on demand rather than on page load: it costs a model call, and a
 * reader scanning ten postings does not want ten of them. The gaps section is
 * written to be blunt — the useful answer is what you cannot claim, not
 * reassurance.
 */
export function JobAnalysis({ jobId }: { jobId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);

  const run = () => {
    setLoading(true);
    setError(null);

    void analyzeJobAction(jobId).then((result) => {
      setLoading(false);
      if (result.status === "error") setError(result.message);
      else setAnalysis(result.data as Analysis);
    });
  };

  if (!analysis) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-rule bg-raised/50 p-5">
        <Eyebrow>Assistant</Eyebrow>
        <p className="text-[0.875rem] leading-relaxed text-ink">
          Read this posting against your profile.
        </p>
        <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
          What it is really for, what it insists on, where you line up and where
          you do not.
        </p>

        {error ? (
          <p
            role="alert"
            className="text-[0.8125rem] leading-relaxed text-danger"
          >
            {error}
          </p>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          onClick={run}
          disabled={loading}
          className="mt-1 self-start"
        >
          {loading ? (
            <>
              <LoaderCircle className="animate-spin" />
              Reading…
            </>
          ) : (
            <>
              <Wand />
              Read this posting
            </>
          )}
        </Button>
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-5 rounded-lg border border-rule bg-surface p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>Assistant</Eyebrow>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="text-[0.75rem] text-ink-muted transition-colors hover:text-ink"
        >
          {loading ? "Reading…" : "Read again"}
        </button>
      </div>

      <p className="text-[0.875rem] leading-relaxed text-ink">
        {analysis.reading}
      </p>

      <Group label="Insists on" items={analysis.mustHaves} numbered />
      <Group label="Would like" items={analysis.niceToHaves} />
      <Group label="Where you line up" items={analysis.strengths} tone="lime" />
      <Group label="Where you do not" items={analysis.gaps} tone="coral" />
      <Group label="Worth leading with" items={analysis.talkingPoints} />

      <p className="border-t border-rule pt-4 text-[0.75rem] leading-relaxed text-ink-faint">
        Read from the posting and from what you wrote about yourself. It is a
        second opinion, not a verdict — and it will not add anything to your
        profile.
      </p>
    </motion.section>
  );
}

function Group({
  label,
  items,
  numbered = false,
  tone,
}: {
  label: string;
  items: string[];
  numbered?: boolean;
  tone?: "lime" | "coral";
}) {
  if (items.length === 0) return null;

  const dot =
    tone === "lime"
      ? "bg-lime-deep"
      : tone === "coral"
        ? "bg-coral"
        : "bg-ink-ghost";

  return (
    <div className="flex flex-col gap-2 border-t border-rule pt-4">
      <Eyebrow>{label}</Eyebrow>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-ink-muted"
          >
            {numbered ? (
              <span
                data-numeric
                aria-hidden
                className="shrink-0 pt-px font-mono text-[0.625rem] text-ink-ghost"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            ) : (
              <span
                aria-hidden
                className={`mt-[0.55em] size-1 shrink-0 rounded-full ${dot}`}
              />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
