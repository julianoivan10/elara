import type { z } from "zod";

/**
 * One shape for every server action result, so forms across the product handle
 * success and failure identically and `useActionState` stays predictable.
 */
export type ActionState = {
  status: "idle" | "ok" | "error";
  message?: string;
  /** Keyed by field name, for inline messages next to the input. */
  errors?: Record<string, string>;
};

export const idle: ActionState = { status: "idle" };

export function ok(message?: string): ActionState {
  return { status: "ok", message };
}

export function fail(
  message: string,
  errors?: Record<string, string>,
): ActionState {
  return { status: "error", message, errors };
}

/** Flatten a Zod error into one message per field. */
export function fromZod(error: z.ZodError): ActionState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return {
    status: "error",
    message: "Check the highlighted fields.",
    errors,
  };
}
