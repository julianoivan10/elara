"use client";

import { useActionState } from "react";

import { Field, FieldHint, FieldLabel, Input } from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError } from "@/components/ui/form";
import {
  forgotPasswordAction,
  resetPasswordAction,
} from "@/server/actions/auth.actions";
import { idle } from "@/server/actions/result";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, idle);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />

      <Field error={fieldError(state, "email")}>
        <FieldLabel>Email</FieldLabel>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="you@example.com"
        />
      </Field>

      <SubmitButton size="lg" className="mt-2" pendingLabel="Sending…">
        Send the reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, idle);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />

      <Field error={fieldError(state, "password")}>
        <FieldLabel>New password</FieldLabel>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          autoFocus
          minLength={10}
        />
        <FieldHint>At least 10 characters.</FieldHint>
      </Field>

      <Field error={fieldError(state, "confirm")}>
        <FieldLabel>Confirm new password</FieldLabel>
        <Input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <SubmitButton size="lg" className="mt-2" pendingLabel="Saving…">
        Set the new password
      </SubmitButton>
    </form>
  );
}
