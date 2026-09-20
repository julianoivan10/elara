"use client";

import { useActionState } from "react";

import { Field, FieldHint, FieldLabel, Input } from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError } from "@/components/ui/form";
import { registerAction } from "@/server/actions/auth.actions";
import { idle } from "@/server/actions/result";

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, idle);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />

      <Field error={fieldError(state, "name")}>
        <FieldLabel>Your name</FieldLabel>
        <Input
          name="name"
          autoComplete="name"
          required
          autoFocus
          placeholder="Amara Ilunga"
        />
        <FieldHint>This is the name that heads your resume.</FieldHint>
      </Field>

      <Field error={fieldError(state, "email")}>
        <FieldLabel>Email</FieldLabel>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field error={fieldError(state, "password")}>
        <FieldLabel>Password</FieldLabel>
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
        />
        <FieldHint>
          At least 10 characters. A short phrase beats a clever word.
        </FieldHint>
      </Field>

      <SubmitButton size="lg" className="mt-2" pendingLabel="Creating…">
        Create your profile
      </SubmitButton>
    </form>
  );
}
