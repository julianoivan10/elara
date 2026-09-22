"use client";

import * as React from "react";
import Link from "next/link";
import { LoaderCircle, Wand } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/editorial";
import { reviewMatchesAction } from "@/server/actions/ai.actions";
import type { JobMatchReview } from "@/services/ai.service";

const VERDICT: Record<JobMatchReview["verdict"], string> = {
  strong: "Strong fit",
  worth_a_look: "Worth a look",
  stretch: "A stretch",
};

/**
 * The assistant's opinion on the recommended jobs, on request only. The list
 * above is already ranked without AI; this adds a written read of the top few,
 * in a single call.
 */
export function MatchReview({
  jobs,
}: {
  jobs: { id: string; title: string; company: string }[];
}) {
  const byId = new Map(jobs.map((j) => [j.id, j]));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reviews, setReviews] = React.useState<JobMatchReview[] | null>(null);

  const run = () => {
    setLoading(true);
    setError(null);
    void reviewMatchesAction(jobs.map((j) => j.id)).then((result) => {
      setLoading(false);
      if (result.status === "error") setError(result.message);
      else setReviews(result.data);
    });
  };

  return (
    <div className="mt-5 flex flex-col gap-4 rounded-lg border border-rule bg-raised/50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Eyebrow>Assistant</Eyebrow>
          <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
            A written read of these matches against your profile — it only cites
            what you have written.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={run} disabled={loading}>
          {loading ? <LoaderCircle className="animate-spin" /> : <Wand />}
          {loading
            ? "Reading…"
            : reviews
              ? "Read again"
              : "Review these matches"}
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="text-[0.8125rem] leading-relaxed text-danger"
        >
          {error}
        </p>
      ) : null}

      {reviews ? (
        reviews.length === 0 ? (
          <p className="text-[0.8125rem] text-ink-muted">
            The assistant had nothing to add.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-rule">
            {reviews.map((review) => (
              <li
                key={review.jobId}
                className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <Link
                    href={`/jobs/${review.jobId}`}
                    className="text-[0.875rem] text-ink underline-offset-4 hover:underline"
                  >
                    {byId.get(review.jobId)?.title ?? "Open the posting"}
                    <span className="text-ink-faint">
                      {" "}
                      · {byId.get(review.jobId)?.company}
                    </span>
                  </Link>
                  <span className="eyebrow text-ink">
                    {VERDICT[review.verdict]}
                  </span>
                </div>
                {review.why.map((line, i) => (
                  <p
                    key={`w${i}`}
                    className="text-[0.8125rem] leading-relaxed text-ink-muted"
                  >
                    {line}
                  </p>
                ))}
                {review.gaps.length ? (
                  <p className="text-[0.75rem] leading-relaxed text-ink-faint">
                    Gaps: {review.gaps.join("; ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
