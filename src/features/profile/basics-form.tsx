"use client";

import * as React from "react";

import {
  Field,
  FieldHint,
  FieldLabel,
  Input,
  Textarea,
} from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { saveBasicsAction } from "@/server/actions/profile.actions";
import {
  applySummaryAction,
  improveSummaryAction,
} from "@/server/actions/ai.actions";
import { idle, type ActionState } from "@/server/actions/result";
import {
  AssistButton,
  SuggestionDialog,
} from "@/features/ai/suggestion-dialog";

type Basics = {
  fullName: string;
  headline: string | null;
  summary: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  openToWork: boolean;
};

/**
 * The identity block. Edited in place rather than in a dialog — it is the first
 * thing a new account fills in, and the summary field wants room to write.
 */
export function BasicsForm({
  basics,
  aiEnabled,
}: {
  basics: Basics;
  aiEnabled: boolean;
}) {
  const [state, action] = React.useActionState(saveBasicsAction, idle);
  const [dirty, setDirty] = React.useState(false);
  const { toast } = useToast();
  const handled = React.useRef<ActionState | null>(null);

  // The assistant works on whatever is in the box right now, not on what was
  // last saved, so a draft can be sharpened before it is committed.
  const [summary, setSummary] = React.useState(basics.summary ?? "");
  const [assistOpen, setAssistOpen] = React.useState(false);

  React.useEffect(() => {
    if (state.status === "ok" && handled.current !== state) {
      handled.current = state;
      setDirty(false);
      toast(state.message ?? "Saved.");
    }
  }, [state, toast]);

  return (
    <form
      action={action}
      onChange={() => setDirty(true)}
      className="flex flex-col gap-6 pt-5"
      noValidate
    >
      <FormMessage state={state} />

      <div className="grid gap-6 md:grid-cols-2">
        <Field error={fieldError(state, "fullName")}>
          <FieldLabel>Full name</FieldLabel>
          <Input name="fullName" defaultValue={basics.fullName} required />
          <FieldHint>Heads every resume you export.</FieldHint>
        </Field>

        <Field error={fieldError(state, "headline")}>
          <FieldLabel optional>Headline</FieldLabel>
          <Input
            name="headline"
            defaultValue={basics.headline ?? ""}
            placeholder="Front-end engineer — design systems"
          />
          <FieldHint>One line: what you do, and what you do it on.</FieldHint>
        </Field>
      </div>

      <Field error={fieldError(state, "summary")}>
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel optional>Summary</FieldLabel>
          {aiEnabled ? (
            <AssistButton onClick={() => setAssistOpen(true)} />
          ) : null}
        </div>
        <Textarea
          name="summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={5}
          placeholder="Three or four sentences a reader can skim before anything else."
        />
        <FieldHint>
          Written once here, and reused by every resume unless you override it.
        </FieldHint>
      </Field>

      {aiEnabled ? (
        <SuggestionDialog
          open={assistOpen}
          onOpenChange={setAssistOpen}
          label="Assistant"
          title="Sharpen your summary"
          original={summary}
          request={() => improveSummaryAction(summary)}
          onAccept={async (text) => {
            const result = await applySummaryAction(text);
            if (result.status !== "error") {
              // Reflect the saved text in the form straight away.
              setSummary(text);
              setDirty(false);
            }
            return result;
          }}
        />
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        <Field error={fieldError(state, "location")}>
          <FieldLabel optional>Location</FieldLabel>
          <Input
            name="location"
            defaultValue={basics.location ?? ""}
            placeholder="Lisbon, Portugal"
          />
        </Field>

        <Field error={fieldError(state, "phone")}>
          <FieldLabel optional>Phone</FieldLabel>
          <Input
            name="phone"
            type="tel"
            defaultValue={basics.phone ?? ""}
            placeholder="+351 912 000 000"
          />
        </Field>

        <Field error={fieldError(state, "website")}>
          <FieldLabel optional>Website</FieldLabel>
          <Input
            name="website"
            type="url"
            defaultValue={basics.website ?? ""}
            placeholder="https://your.site"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-5">
        <label className="flex items-center gap-2.5 text-[0.8125rem] text-ink">
          <input
            type="checkbox"
            name="openToWork"
            defaultChecked={basics.openToWork}
            className="size-4 accent-[var(--color-ink)]"
          />
          I am open to new roles
        </label>

        <div className="flex items-center gap-3">
          {dirty ? (
            <span className="eyebrow text-warning">Unsaved changes</span>
          ) : null}
          <SubmitButton pendingLabel="Saving…">Save details</SubmitButton>
        </div>
      </div>
    </form>
  );
}
