"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AuthorizationError,
  NotFoundError,
  requireUser,
} from "@/server/auth/guards";
import { ApplicationService } from "@/services/application.service";
import {
  fail,
  fromZod,
  ok,
  unexpected,
  type ActionState,
} from "@/server/actions/result";

const STATUSES = [
  "SAVED",
  "APPLIED",
  "SCREENING",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
] as const;

function handle(error: unknown, context: string): ActionState {
  if (error instanceof AuthorizationError || error instanceof NotFoundError) {
    return fail(error.message);
  }
  return unexpected(error, context);
}

function refresh() {
  revalidatePath("/applications");
  revalidatePath("/dashboard");
}

/* ------------------------------------------------------------------ dates */

/** `<input type="datetime-local">` gives "YYYY-MM-DDTHH:mm" in local time. */
const localDateTime = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? new Date(value) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), {
    message: "That date is not valid.",
  });

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

/* ----------------------------------------------------------------- create */

const createSchema = z.object({
  company: z.string().trim().min(1, "Which company?").max(120),
  role: z.string().trim().min(1, "Which role?").max(120),
  location: optional(120),
  url: optional(500),
  source: optional(60),
  status: z.enum(STATUSES).default("SAVED"),
});

export async function createApplicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = createSchema.safeParse({
    company: formData.get("company"),
    role: formData.get("role"),
    location: formData.get("location"),
    url: formData.get("url"),
    source: formData.get("source"),
    status: formData.get("status") ?? undefined,
  });
  if (!parsed.success) return fromZod(parsed.error);

  try {
    await ApplicationService.create(user.id, parsed.data);
    refresh();
    return ok("Added to your tracker.");
  } catch (error) {
    return handle(error, "createApplicationAction");
  }
}

/* ----------------------------------------------------------------- update */

const updateSchema = z.object({
  company: z.string().trim().min(1, "Which company?").max(120),
  role: z.string().trim().min(1, "Which role?").max(120),
  location: optional(120),
  url: optional(500),
  source: optional(60),
  nextEventLabel: optional(80),
  nextEventAt: localDateTime,
});

export async function updateApplicationAction(
  applicationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = updateSchema.safeParse({
    company: formData.get("company"),
    role: formData.get("role"),
    location: formData.get("location"),
    url: formData.get("url"),
    source: formData.get("source"),
    nextEventLabel: formData.get("nextEventLabel"),
    nextEventAt: formData.get("nextEventAt"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  try {
    await ApplicationService.update(user.id, applicationId, parsed.data);
    refresh();
    return ok("Saved.");
  } catch (error) {
    return handle(error, "updateApplicationAction");
  }
}

/**
 * Moving a card between columns. The service records the change as an event, so
 * the history on the card is real rather than a single overwritten field.
 */
export async function setApplicationStatusAction(
  applicationId: string,
  status: string,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = z.enum(STATUSES).safeParse(status);
  if (!parsed.success) return fail("That is not a valid stage.");

  try {
    await ApplicationService.setStatus(user.id, applicationId, parsed.data);
    refresh();
    return ok();
  } catch (error) {
    return handle(error, "setApplicationStatusAction");
  }
}

export async function deleteApplicationAction(
  applicationId: string,
): Promise<ActionState> {
  const user = await requireUser();

  try {
    await ApplicationService.remove(user.id, applicationId);
    refresh();
    return ok("Removed from your tracker.");
  } catch (error) {
    return handle(error, "deleteApplicationAction");
  }
}

/* ----------------------------------------------------------------- detail */

/**
 * Notes and history for one application, loaded when its card is opened rather
 * than shipped with every card on the board.
 */
export type ApplicationDetail = {
  ok: boolean;
  notes: { id: string; body: string; createdAt: Date }[];
  events: {
    id: string;
    fromStatus: (typeof STATUSES)[number] | null;
    toStatus: (typeof STATUSES)[number];
    createdAt: Date;
  }[];
};

export async function loadApplicationDetailAction(
  applicationId: string,
): Promise<ApplicationDetail> {
  const user = await requireUser();

  try {
    const application = await ApplicationService.get(user.id, applicationId);

    return {
      ok: true,
      notes: application.notes.map((note) => ({
        id: note.id,
        body: note.body,
        createdAt: note.createdAt,
      })),
      events: application.events.map((event) => ({
        id: event.id,
        fromStatus: event.fromStatus,
        toStatus: event.toStatus,
        createdAt: event.createdAt,
      })),
    };
  } catch {
    // A missing or unowned application looks the same as an empty one here;
    // the board it was opened from has already gated on ownership.
    return { ok: false, notes: [], events: [] };
  }
}

/* ------------------------------------------------------------------ notes */

export async function addApplicationNoteAction(
  applicationId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(2000, "That note is too long.")
    .safeParse(formData.get("body"));

  if (!parsed.success) {
    return fail("Write something first.", {
      body: parsed.error.issues[0].message,
    });
  }

  try {
    await ApplicationService.addNote(user.id, applicationId, parsed.data);
    refresh();
    return ok("Note added.");
  } catch (error) {
    return handle(error, "addApplicationNoteAction");
  }
}

export async function deleteApplicationNoteAction(
  noteId: string,
): Promise<ActionState> {
  const user = await requireUser();

  try {
    await ApplicationService.removeNote(user.id, noteId);
    refresh();
    return ok("Note deleted.");
  } catch (error) {
    return handle(error, "deleteApplicationNoteAction");
  }
}
