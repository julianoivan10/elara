"use client";

import * as React from "react";
import { Check, LoaderCircle, Plus, Wand } from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { suggestSkillsAction } from "@/server/actions/ai.actions";
import { addSkillsAction } from "@/server/actions/profile.actions";
import { idle } from "@/server/actions/result";

type Suggestion = { name: string; evidence: string };

/**
 * Skill suggestions are *extraction*, not recommendation.
 *
 * The assistant reads what the person already wrote about their work and pulls
 * out skills they demonstrated but never listed — and shows the sentence that
 * justifies each one, so nothing goes onto a profile unevidenced.
 */
export function SkillSuggestions() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Wand />
        Find skills in my work
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader
            label="Assistant"
            title="Skills already in your writing"
            description="Read from what you wrote about your roles and projects. Nothing is added until you pick it."
          />

          {open ? <SkillBody onDone={() => setOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Mounted only while the dialog is open, so every visit starts from a clean
 * request rather than a reset of last time's state.
 */
function SkillBody({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([]);
  // Nothing is pre-selected: adding a skill is a claim about yourself.
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [saving, startSaving] = React.useTransition();
  const { toast } = useToast();

  React.useEffect(() => {
    let cancelled = false;

    void suggestSkillsAction().then((response) => {
      if (cancelled) return;
      setLoading(false);
      if (response.status === "error") setError(response.message);
      else setSuggestions(response.data.suggestions);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (name: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const add = () => {
    if (selected.size === 0) return;

    startSaving(async () => {
      const formData = new FormData();
      formData.set("names", [...selected].join(", "));
      const result = await addSkillsAction(idle, formData);

      toast(result.message ?? "Added.", {
        tone: result.status === "error" ? "error" : "success",
      });
      if (result.status !== "error") onDone();
    });
  };

  return (
    <>
      <DialogBody>
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
        ) : suggestions.length === 0 ? (
          <p className="text-[0.875rem] leading-relaxed text-ink-muted">
            Nothing to add — everything the assistant could find in your writing
            is already on your list.
          </p>
        ) : (
          <ul className="flex flex-col">
            {suggestions.map((suggestion) => {
              const chosen = selected.has(suggestion.name);
              return (
                <li
                  key={suggestion.name}
                  className="border-b border-rule last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => toggle(suggestion.name)}
                    aria-pressed={chosen}
                    className="flex w-full items-start gap-3 py-3 text-left"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                        chosen
                          ? "border-ink bg-ink text-paper"
                          : "border-rule-strong text-transparent",
                      )}
                    >
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.875rem] font-medium text-ink">
                        {suggestion.name}
                      </span>
                      <span className="mt-1 block text-[0.8125rem] leading-relaxed text-ink-muted">
                        <span className="eyebrow mr-2">Because</span>
                        {suggestion.evidence}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogBody>

      <DialogFooter>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={add} disabled={selected.size === 0 || saving}>
          <Plus />
          {saving
            ? "Adding…"
            : `Add ${selected.size || ""} ${selected.size === 1 ? "skill" : "skills"}`.trim()}
        </Button>
      </DialogFooter>
    </>
  );
}
