"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/cn";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { ActionState } from "@/server/actions/result";

/**
 * Form plumbing shared by every server-action form in the product: a submit
 * button that knows it is pending, and a status line that announces the result.
 */

export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <LoaderCircle className="animate-spin" />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/**
 * The result of a submit, announced politely. Errors use role="alert" so they
 * interrupt; confirmations do not.
 */
export function FormMessage({
  state,
  className,
}: {
  state: ActionState;
  className?: string;
}) {
  if (state.status === "idle" || !state.message) return null;

  const isError = state.status === "error";

  return (
    <p
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2.5 text-[0.8125rem] leading-snug",
        isError
          ? "border-danger/25 bg-danger-tint text-danger"
          : "border-success/25 bg-success-tint text-success",
        className,
      )}
    >
      {isError ? (
        <CircleAlert className="mt-px size-3.5 shrink-0" />
      ) : (
        <CircleCheck className="mt-px size-3.5 shrink-0" />
      )}
      <span>{state.message}</span>
    </p>
  );
}

/** Read one field's error out of an action result. */
export function fieldError(state: ActionState, name: string) {
  return state.errors?.[name] ?? null;
}
