"use client";

import * as React from "react";
import { Check, Info, LoaderCircle, Wand } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/editorial";
import { useToast } from "@/components/ui/toast";
import { tailorResumeAction } from "@/server/actions/ai.actions";
import type { TailorResult } from "@/services/ai.service";

/**
 * The assistant's read of this resume against its target posting.
 *
 * On demand, because it costs a model call. The tailored summary is applied to
 * *this resume only* (as a summary override), so the profile — the record every
 * other resume reads — is never changed by tailoring one application.
 */
export function TailorAssist({
  resumeId,
  onUseSummary,
}: {
  resumeId: string;
  /** Absent when the resume has no summary section to write to. */
  onUseSummary?: (text: string) => void;
}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<TailorResult | null>(null);
  const [applied, setApplied] = React.useState(false);
  const { toast } = useToast();

  const run = () => {
    setLoading(true);
    setError(null);

    void tailorResumeAction(resumeId).then((response) => {
      setLoading(false);
      if (response.status === "error") {
        setError(response.message);
      } else {
        setResult(response.data);
        setApplied(false);
      }
    });
  };

  return (
    <section className="flex flex-col gap-3 border-t border-rule pt-5">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>Tailor with the assistant</Eyebrow>
        {result ? (
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="text-[0.75rem] text-ink-muted transition-colors hover:text-ink"
          >
            {loading ? "Reading…" : "Read again"}
          </button>
        ) : null}
      </div>

      {!result ? (
        <>
          <p className="text-[0.75rem] leading-relaxed text-ink-muted">
            A summary angled at this role, the lines of yours worth leading
            with, and the posting&rsquo;s keywords you have and have not shown.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={run}
            disabled={loading}
            className="self-start"
          >
            {loading ? (
              <>
                <LoaderCircle className="animate-spin" />
                Reading…
              </>
            ) : (
              <>
                <Wand />
                Tailor this resume
              </>
            )}
          </Button>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="text-[0.75rem] leading-relaxed text-danger">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-4">
          {result.summary ? (
            <div className="flex flex-col gap-2">
              <Eyebrow>Summary for this role</Eyebrow>
              <p className="rounded-sm border border-rule bg-raised/60 p-3 text-[0.8125rem] leading-relaxed text-ink">
                {result.summary}
              </p>
              {onUseSummary ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={applied}
                  onClick={() => {
                    onUseSummary(result.summary!);
                    setApplied(true);
                    toast("Summary used on this resume.");
                  }}
                >
                  <Check />
                  {applied ? "Used on this resume" : "Use on this resume"}
                </Button>
              ) : null}
            </div>
          ) : null}

          {result.filtered ? (
            <p className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning-tint px-3 py-2 text-[0.75rem] leading-snug text-warning">
              <Info className="mt-px size-3.5 shrink-0" />
              <span>
                A suggested summary was discarded for inventing a figure you had
                not written.
              </span>
            </p>
          ) : null}

          <List
            label="Lead with these lines of yours"
            items={result.leadWith}
          />

          {result.matchedKeywords.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Eyebrow>Keywords you already show</Eyebrow>
              <ul className="flex flex-col gap-1.5">
                {result.matchedKeywords.map((k) => (
                  <li
                    key={k.keyword}
                    className="text-[0.75rem] leading-relaxed text-ink-muted"
                  >
                    <span className="mr-1.5 rounded-xs border border-lime-deep/40 bg-lime-tint px-1.5 py-0.5 text-[0.6875rem] text-[#4b6106]">
                      {k.keyword}
                    </span>
                    {k.evidence}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.missingKeywords.length > 0 ? (
            <div className="flex flex-col gap-2">
              <Eyebrow>Keywords you have not shown</Eyebrow>
              <ul className="flex flex-wrap gap-1.5">
                {result.missingKeywords.map((k) => (
                  <li
                    key={k}
                    className="rounded-xs border border-dashed border-rule-strong px-1.5 py-0.5 text-[0.6875rem] text-ink-faint"
                  >
                    {k}
                  </li>
                ))}
              </ul>
              <p className="text-[0.6875rem] leading-snug text-ink-faint">
                Add one to your profile only if it is genuinely true of you.
              </p>
            </div>
          ) : null}

          <List label="Notes" items={result.notes} />
        </div>
      ) : null}
    </section>
  );
}

function List({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Eyebrow>{label}</Eyebrow>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex gap-2 text-[0.75rem] leading-relaxed text-ink-muted"
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
