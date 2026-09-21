"use client";

import * as React from "react";
import { Wand } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  applyHighlightAction,
  applyProjectDescriptionAction,
  describeProjectAction,
  improveHighlightAction,
} from "@/server/actions/ai.actions";
import {
  AssistButton,
  SuggestionDialog,
} from "@/features/ai/suggestion-dialog";

/**
 * Experience bullets with a "sharpen" control on each line.
 *
 * The request names the bullet by entry id and position only; the server reads
 * the text itself, so the assistant never works on anything but the saved line.
 */
export function AssistedHighlights({
  experienceId,
  role,
  items,
}: {
  experienceId: string;
  role: string;
  items: string[];
}) {
  const [active, setActive] = React.useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-ink-muted"
          >
            <span
              aria-hidden
              className="mt-[0.55em] size-1 shrink-0 rounded-full bg-ink-ghost"
            />
            <span className="min-w-0 flex-1">{item}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="-my-1 shrink-0 text-ink-faint hover:text-ink"
              onClick={() => setActive(i)}
              aria-label={`Sharpen this line from ${role}`}
              title="Sharpen this line"
            >
              <Wand />
            </Button>
          </li>
        ))}
      </ul>

      <SuggestionDialog
        open={active !== null}
        onOpenChange={(open) => {
          if (!open) setActive(null);
        }}
        label="Assistant"
        title="Sharpen this line"
        original={active !== null ? (items[active] ?? "") : ""}
        request={() =>
          improveHighlightAction({ experienceId, index: active ?? 0 })
        }
        onAccept={(text) =>
          applyHighlightAction({ experienceId, index: active ?? 0, text })
        }
      />
    </>
  );
}

/** "Write the description for me" — from the project's own notes. */
export function ProjectDescriptionAssist({
  projectId,
  description,
}: {
  projectId: string;
  description: string | null;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div className="mt-2.5">
        <AssistButton onClick={() => setOpen(true)}>
          {description ? "Sharpen description" : "Draft a description"}
        </AssistButton>
      </div>

      <SuggestionDialog
        open={open}
        onOpenChange={setOpen}
        label="Assistant"
        title="Project description"
        original={description ?? ""}
        request={() => describeProjectAction(projectId)}
        onAccept={(text) => applyProjectDescriptionAction({ projectId, text })}
      />
    </>
  );
}
