"use client";

import * as React from "react";
import { LoaderCircle, Wand } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/editorial";
import { reviewProfileAction } from "@/server/actions/ai.actions";
import type { ProfileReview as Review } from "@/services/ai.service";

/**
 * A second pair of eyes on the whole profile.
 *
 * Advice and questions only — it never writes content. The questions are the
 * point: the most useful facts on a resume are the ones only the person knows,
 * so the assistant asks for them instead of guessing.
 */
export function ProfileReview() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [review, setReview] = React.useState<Review | null>(null);

  const run = () => {
    setLoading(true);
    setError(null);

    void reviewProfileAction().then((response) => {
      setLoading(false);
      if (response.status === "error") setError(response.message);
      else setReview(response.data);
    });
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-rule bg-raised/50 p-5">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>Assistant</Eyebrow>
        {review ? (
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="text-[0.75rem] text-ink-muted transition-colors hover:text-ink"
          >
            {loading ? "Reading…" : "Review again"}
          </button>
        ) : null}
      </div>

      {!review ? (
        <>
          <p className="text-[0.875rem] leading-relaxed text-ink">
            Get a review of your profile.
          </p>
          <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
            What already works, what to clarify, and questions whose answers
            would make it stronger. It suggests; it never writes for you.
          </p>
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
                Review my profile
              </>
            )}
          </Button>
        </>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="text-[0.8125rem] leading-relaxed text-danger"
        >
          {error}
        </p>
      ) : null}

      {review ? (
        <div className="flex flex-col gap-4">
          <Group label="Already working" items={review.strengths} />

          {review.suggestions.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-rule pt-4">
              <Eyebrow>Worth improving</Eyebrow>
              <ul className="flex flex-col gap-2.5">
                {review.suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="text-[0.8125rem] leading-relaxed text-ink-muted"
                  >
                    <span className="block font-medium text-ink">{s.area}</span>
                    {s.advice}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Group label="Questions to answer" items={review.questions} />
        </div>
      ) : null}
    </section>
  );
}

function Group({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-rule pt-4">
      <Eyebrow>{label}</Eyebrow>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-ink-muted"
          >
            <span
              aria-hidden
              className="mt-[0.55em] size-1 shrink-0 rounded-full bg-ink-ghost"
            />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
