"use client";

import * as React from "react";
import { Check, Info, LoaderCircle, Wand } from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/editorial";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/server/actions/result";
import type { AiResult } from "@/server/actions/ai.actions";
import type { Suggestions } from "@/services/ai.service";

/**
 * Suggestions arrive *beside* the user's text, never in place of it.
 *
 * Nothing is written until a suggestion is chosen and confirmed. The panel also
 * reports what the assistant changed and, when the safety check dropped a
 * suggestion for inventing a figure, says so plainly rather than hiding it.
 *
 * The request lives in an inner component that only exists while the dialog is
 * open, so each visit starts clean — there is no stale result to reset, and no
 * state to clear on close.
 */
export function SuggestionDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  original: string;
  request: () => Promise<AiResult<Suggestions>>;
  onAccept: (text: string) => Promise<ActionState>;
}) {
  const { open, onOpenChange, title, label } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader
          label={label}
          title={title}
          description="Your text is on the left. Nothing changes until you choose a version and accept it."
        />
        {open ? <SuggestionBody {...props} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function SuggestionBody({
  onOpenChange,
  original,
  request,
  onAccept,
}: {
  onOpenChange: (open: boolean) => void;
  original: string;
  request: () => Promise<AiResult<Suggestions>>;
  onAccept: (text: string) => Promise<ActionState>;
}) {
  // Loading starts true because the request fires on mount; nothing is set
  // synchronously inside the effect.
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<Suggestions | null>(null);
  const [chosen, setChosen] = React.useState(0);
  const [saving, startSaving] = React.useTransition();
  const { toast } = useToast();

  // Captured once on mount. The component only exists while the dialog is
  // open, so there is no later `request` to pick up.
  const [run] = React.useState(() => request);

  React.useEffect(() => {
    let cancelled = false;

    void run().then((response) => {
      if (cancelled) return;
      setLoading(false);
      if (response.status === "error") setError(response.message);
      else setResult(response.data);
    });

    return () => {
      cancelled = true;
    };
  }, [run]);

  const accept = () => {
    const text = result?.suggestions[chosen];
    if (!text) return;

    startSaving(async () => {
      const outcome = await onAccept(text);
      toast(outcome.message ?? "Saved.", {
        tone: outcome.status === "error" ? "error" : "success",
      });
      if (outcome.status !== "error") onOpenChange(false);
    });
  };

  return (
    <>
      <DialogBody className="flex flex-col gap-6">
        <div className="grid gap-px overflow-hidden rounded-md border border-rule bg-rule md:grid-cols-2">
          <div className="flex flex-col gap-2 bg-surface p-4">
            <Eyebrow>What you wrote</Eyebrow>
            <p className="whitespace-pre-wrap text-[0.875rem] leading-relaxed text-ink-faint">
              {original || "Nothing yet."}
            </p>
          </div>

          <div className="flex min-h-40 flex-col gap-3 bg-surface p-4">
            <Eyebrow className="text-cobalt-ink">Suggested</Eyebrow>

            {loading ? (
              <p className="flex items-center gap-2 text-[0.875rem] text-ink-faint">
                <LoaderCircle className="size-3.5 animate-spin" />
                Reading your profile…
              </p>
            ) : error ? (
              <p
                role="alert"
                className="text-[0.875rem] leading-relaxed text-danger"
              >
                {error}
              </p>
            ) : result && result.suggestions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {result.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setChosen(index)}
                    aria-pressed={chosen === index}
                    className={cn(
                      "flex items-start gap-2.5 rounded-sm border p-3 text-left transition-colors",
                      chosen === index
                        ? "border-ink bg-raised/60"
                        : "border-rule hover:border-rule-strong",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border",
                        chosen === index
                          ? "border-ink bg-ink text-paper"
                          : "border-rule-strong text-transparent",
                      )}
                    >
                      <Check className="size-2" strokeWidth={4} />
                    </span>
                    <span className="text-[0.875rem] leading-relaxed text-ink">
                      {suggestion}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[0.875rem] leading-relaxed text-ink-muted">
                {result?.needsMore ??
                  "The assistant had nothing worth suggesting here."}
              </p>
            )}
          </div>
        </div>

        {result?.notes && result.notes.length > 0 ? (
          <div className="flex flex-col gap-2">
            <Eyebrow>What changed</Eyebrow>
            <ul className="flex flex-col gap-1.5">
              {result.notes.map((note, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-2 text-[0.8125rem] leading-relaxed text-ink-muted"
                >
                  <span
                    aria-hidden
                    className="size-1 shrink-0 translate-y-[-2px] rounded-full bg-lime-deep"
                  />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {result?.filtered ? (
          <p className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning-tint px-3 py-2.5 text-[0.8125rem] leading-snug text-warning">
            <Info className="mt-px size-3.5 shrink-0" />
            <span>
              {result.filtered === 1
                ? "One suggestion was discarded for inventing a figure you had not written."
                : `${result.filtered} suggestions were discarded for inventing figures you had not written.`}{" "}
              ELARA will not put a number on your resume that you did not put
              there.
            </span>
          </p>
        ) : null}

        {result?.needsMore && result.suggestions.length > 0 ? (
          <p className="text-[0.8125rem] leading-relaxed text-ink-faint">
            {result.needsMore}
          </p>
        ) : null}
      </DialogBody>

      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Keep mine
        </Button>
        <Button
          onClick={accept}
          disabled={saving || !result?.suggestions.length}
        >
          {saving ? "Saving…" : "Use this version"}
        </Button>
      </DialogFooter>
    </>
  );
}

/** The trigger that opens an assistant panel. */
export function AssistButton({
  onClick,
  children = "Sharpen this",
  size = "sm",
}: {
  onClick: () => void;
  children?: React.ReactNode;
  size?: "sm" | "md";
}) {
  return (
    <Button variant="outline" size={size} onClick={onClick} type="button">
      <Wand />
      {children}
    </Button>
  );
}
