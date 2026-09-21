import "server-only";

import { logError } from "@/server/log";
import type { ActionState } from "@/server/actions/result";

/**
 * Turn an unexpected failure into something safe to show.
 *
 * The person sees a neutral message; the server log gets a structured summary
 * of the real cause (see logError), which is where a failing deployment is
 * diagnosed. Raw errors never reach the browser: database errors can carry
 * table names, constraint names and occasionally user data.
 */
export function unexpected(
  error: unknown,
  context: string,
  extra?: Record<string, string | number | boolean | undefined>,
): ActionState {
  logError(context, error, extra);
  return {
    status: "error",
    message: "Something went wrong on our side. Please try again.",
  };
}
