"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldHint, FieldLabel, Input } from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError } from "@/components/ui/form";
import { RESUME_TEMPLATES } from "@/features/resume/templates";
import { createResumeAction } from "@/server/actions/resume.actions";
import { idle } from "@/server/actions/result";

/**
 * Creating a resume asks for two things: what it is for, and how it should be
 * set. Both are changeable later, so the dialog stays short.
 */
export function NewResumeDialog({
  suggestedTitle,
  variant = "primary",
  label = "New resume",
}: {
  suggestedTitle?: string;
  variant?: "primary" | "outline";
  label?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [templateKey, setTemplateKey] = React.useState("editorial");
  const [state, action] = React.useActionState(createResumeAction, idle);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus />
          {label}
        </Button>
      </DialogTrigger>

      <DialogContent size="lg">
        <DialogHeader
          label="Resumes"
          title="New resume"
          description="It is built from your career profile, so there is nothing to retype."
        />

        <form action={action}>
          <DialogBody className="flex flex-col gap-6">
            <FormMessage state={state} />

            <Field error={fieldError(state, "title")}>
              <FieldLabel>What is it for</FieldLabel>
              <Input
                name="title"
                required
                autoFocus
                defaultValue={suggestedTitle}
                placeholder="Front-end engineer — general"
              />
              <FieldHint>
                A name for you, not a heading on the page. Keeping several, each
                aimed at a kind of role, is the point.
              </FieldHint>
            </Field>

            <fieldset className="flex flex-col gap-2">
              <legend className="eyebrow mb-2">Template</legend>
              <input type="hidden" name="templateKey" value={templateKey} />

              <div className="grid gap-2 sm:grid-cols-2">
                {RESUME_TEMPLATES.map((template) => {
                  const active = template.key === templateKey;
                  return (
                    <button
                      key={template.key}
                      type="button"
                      onClick={() => setTemplateKey(template.key)}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col gap-1 rounded-md border px-3.5 py-3 text-left transition-colors",
                        active
                          ? "border-ink bg-raised/60"
                          : "border-rule hover:border-rule-strong",
                      )}
                    >
                      <span className="text-[0.875rem] font-medium text-ink">
                        {template.name}
                      </span>
                      <span className="text-[0.75rem] leading-snug text-ink-muted">
                        {template.description}
                      </span>
                      <span className="eyebrow mt-1">{template.bestFor}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton pendingLabel="Creating…">Create resume</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
