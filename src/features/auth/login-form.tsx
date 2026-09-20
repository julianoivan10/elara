"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Field, FieldLabel, Input } from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError } from "@/components/ui/form";
import { loginAction } from "@/server/actions/auth.actions";
import { idle } from "@/server/actions/result";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, idle);

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

      <Field error={fieldError(state, "password")}>
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel>Password</FieldLabel>
          <Link
            href="/forgot-password"
            className="shrink-0 text-[0.75rem] text-cobalt-ink underline decoration-cobalt-soft underline-offset-4 hover:decoration-cobalt-ink"
          >
            Forgot it?
          </Link>
        </div>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton size="lg" className="mt-2" pendingLabel="Signing in…">
        Log in
      </SubmitButton>
    </form>
  );
}
