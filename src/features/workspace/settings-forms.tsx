"use client";

import * as React from "react";
import { MailCheck, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldHint, FieldLabel, Input } from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError } from "@/components/ui/form";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  changePasswordAction,
  resendVerificationAction,
} from "@/server/actions/auth.actions";
import {
  deleteAccountAction,
  updateAccountNameAction,
} from "@/server/actions/account.actions";
import { idle, type ActionState } from "@/server/actions/result";

function useToastOnSuccess(state: ActionState) {
  const { toast } = useToast();
  const handled = React.useRef<ActionState | null>(null);

  React.useEffect(() => {
    if (state.status === "ok" && handled.current !== state) {
      handled.current = state;
      if (state.message) toast(state.message);
    }
  }, [state, toast]);
}

export function NameForm({ name }: { name: string }) {
  const [state, action] = React.useActionState(updateAccountNameAction, idle);
  useToastOnSuccess(state);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />

      <Field error={fieldError(state, "name")}>
        <FieldLabel>Name</FieldLabel>
        <Input name="name" defaultValue={name} required />
        <FieldHint>
          Used to greet you. Your resume header comes from your career profile,
          which you can set separately.
        </FieldHint>
      </Field>

      <SubmitButton size="sm" variant="outline" className="self-start">
        Save
      </SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = React.useActionState(changePasswordAction, idle);
  const formRef = React.useRef<HTMLFormElement>(null);
  const handled = React.useRef<ActionState | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    if (state.status === "ok" && handled.current !== state) {
      handled.current = state;
      formRef.current?.reset();
      if (state.message) toast(state.message);
    }
  }, [state, toast]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-5"
      noValidate
    >
      <FormMessage state={state} />

      <Field error={fieldError(state, "current")}>
        <FieldLabel>Current password</FieldLabel>
        <Input
          name="current"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={fieldError(state, "password")}>
          <FieldLabel>New password</FieldLabel>
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </Field>

        <Field error={fieldError(state, "confirm")}>
          <FieldLabel>Confirm it</FieldLabel>
          <Input
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>
      </div>

      <p className="text-[0.75rem] leading-relaxed text-ink-faint">
        Changing your password signs out every other device. This one stays
        signed in.
      </p>

      <SubmitButton size="sm" variant="outline" className="self-start">
        Change password
      </SubmitButton>
    </form>
  );
}

export function VerifyEmailRow({
  email,
  verified,
}: {
  email: string;
  verified: boolean;
}) {
  const [pending, startTransition] = React.useTransition();
  const { toast } = useToast();

  const resend = () =>
    startTransition(async () => {
      const result = await resendVerificationAction();
      toast(result.message ?? "Sent.", {
        tone: result.status === "error" ? "error" : "success",
      });
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[0.875rem] text-ink">{email}</p>
        <p className="mt-1 flex items-center gap-1.5 text-[0.75rem] text-ink-muted">
          {verified ? (
            <>
              <MailCheck className="size-3.5 text-success" />
              Confirmed
            </>
          ) : (
            <>
              <ShieldAlert className="size-3.5 text-warning" />
              Not confirmed yet — password recovery needs this.
            </>
          )}
        </p>
      </div>

      {!verified ? (
        <Button size="sm" variant="outline" onClick={resend} disabled={pending}>
          {pending ? "Sending…" : "Send confirmation"}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Account deletion. Asks for the password *and* a typed confirmation, because
 * this removes the profile, every resume, every saved job and the whole
 * application history with no way back.
 */
export function DeleteAccountDialog() {
  const [open, setOpen] = React.useState(false);
  const [state, action] = React.useActionState(deleteAccountAction, idle);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="danger" size="sm">
          Delete my account
        </Button>
      </DialogTrigger>

      <DialogContent size="sm">
        <DialogHeader
          label="Permanent"
          title="Delete your account"
          description="Your profile, resumes, saved jobs and application history are removed immediately and cannot be recovered."
        />

        <form action={action}>
          <DialogBody className="flex flex-col gap-5">
            <FormMessage state={state} />

            <Field error={fieldError(state, "password")}>
              <FieldLabel>Your password</FieldLabel>
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>

            <Field error={fieldError(state, "confirm")}>
              <FieldLabel>Type “delete my account”</FieldLabel>
              <Input name="confirm" required placeholder="delete my account" />
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Keep my account
            </Button>
            <SubmitButton variant="danger" pendingLabel="Deleting…">
              Delete permanently
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
