"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { idle, type ActionState } from "@/server/actions/result";

/**
 * The add/edit dialog every profile section uses.
 *
 * It owns the parts that are the same everywhere — open state, the action
 * result, closing once the server confirms, and the toast — so each section
 * only has to supply its fields.
 */
export function EntryDialog({
  trigger,
  label,
  title,
  description,
  action,
  submitLabel = "Save",
  size = "md",
  children,
}: {
  trigger: React.ReactNode;
  label?: string;
  title: string;
  description?: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel?: string;
  size?: "sm" | "md" | "lg";
  children: (state: ActionState) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = React.useActionState(action, idle);
  const { toast } = useToast();

  // useActionState returns a fresh object per submit, so identity is enough to
  // tell a new success from the one already handled.
  const handled = React.useRef<ActionState | null>(null);

  React.useEffect(() => {
    if (state.status === "ok" && handled.current !== state) {
      handled.current = state;
      setOpen(false);
      if (state.message) toast(state.message);
    }
  }, [state, toast]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size={size}>
        <DialogHeader label={label} title={title} description={description} />
        <form action={formAction}>
          <DialogBody className="flex flex-col gap-5">
            <FormMessage state={state} />
            {children(state)}
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Deletion always asks first and names what is going, because these are
 * records a person may have spent time writing.
 */
export function DeleteEntryButton({
  name,
  onConfirm,
  trigger,
}: {
  name: string;
  onConfirm: () => Promise<ActionState>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const { toast } = useToast();

  const confirm = () =>
    startTransition(async () => {
      const result = await onConfirm();
      setOpen(false);
      toast(result.message ?? "Deleted.", {
        tone: result.status === "error" ? "error" : "success",
      });
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${name}`}
            title="Delete"
          >
            <Trash2 />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent size="sm">
        <DialogHeader
          label="Confirm"
          title={`Delete ${name}?`}
          description="This removes it from your profile and from every resume that uses it. It cannot be undone."
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Keep it
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
