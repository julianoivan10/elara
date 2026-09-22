"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import {
  AuthorizationError,
  NotFoundError,
  requireUser,
} from "@/server/auth/guards";
import { JobService } from "@/services/job.service";
import { ApplicationService } from "@/services/application.service";
import { fail, ok, type ActionState } from "@/server/actions/result";
import { unexpected } from "@/server/actions/unexpected";

/** Save or unsave a job. One button, one action, reported back to the caller. */
export async function toggleSavedJobAction(
  jobId: string,
): Promise<ActionState & { saved?: boolean }> {
  const user = await requireUser();

  try {
    const exists = await db.job.findFirst({
      where: { id: jobId, isDemo: false },
      select: { id: true },
    });
    if (!exists) return fail("That job is no longer listed.");

    const { saved } = await JobService.toggleSaved(user.id, jobId);

    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/saved");
    revalidatePath("/dashboard");

    return { ...ok(saved ? "Saved." : "Removed from saved."), saved };
  } catch (error) {
    return unexpected(error, "toggleSavedJobAction");
  }
}

/**
 * Start tracking a job. Returns quietly if it is already on the board rather
 * than creating a duplicate row.
 */
export async function trackJobAction(jobId: string): Promise<ActionState> {
  const user = await requireUser();

  try {
    await ApplicationService.createFromJob(user.id, jobId);

    revalidatePath("/applications");
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/dashboard");

    return ok("Added to your tracker.");
  } catch (error) {
    return unexpected(error, "trackJobAction");
  }
}

/* ---------------------------------------------------- application prep */

const answersSchema = z
  .array(
    z.object({
      question: z.string().trim().min(1).max(300),
      answer: z.string().trim().max(4000),
    }),
  )
  .max(12);

const prepareSchema = z.object({
  jobId: z.string().trim().min(1).max(64),
  resumeId: z.string().trim().min(1).max(64).nullable(),
  coverLetter: z.string().max(6000).nullable(),
  answers: answersSchema,
});

/**
 * Save what the person prepared for a job. Nothing is sent to the employer:
 * ELARA has no authorised submission channel for these providers, so the
 * person applies on the official page with what they prepared here.
 */
export async function prepareApplicationAction(
  input: z.input<typeof prepareSchema>,
): Promise<ActionState & { applicationId?: string }> {
  const user = await requireUser();

  const parsed = prepareSchema.safeParse(input);
  if (!parsed.success)
    return fail("Check the resume, cover letter and answers, then try again.");

  try {
    const { id } = await ApplicationService.prepare(
      user.id,
      parsed.data.jobId,
      {
        resumeId: parsed.data.resumeId,
        coverLetter: parsed.data.coverLetter?.trim() || null,
        // Questions without an answer are not worth keeping.
        answers: parsed.data.answers.filter((a) => a.answer.length > 0),
      },
    );

    revalidatePath("/applications");
    revalidatePath(`/jobs/${parsed.data.jobId}`);
    revalidatePath("/dashboard");
    return {
      ...ok(
        "Application prepared. Apply on the official page when you are ready.",
      ),
      applicationId: id,
    };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof NotFoundError)
      return fail(error.message);
    return unexpected(error, "prepareApplicationAction");
  }
}

/** The person applied on the official page and says so. */
export async function markAppliedAction(
  applicationId: string,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = z.string().trim().min(1).max(64).safeParse(applicationId);
  if (!parsed.success) return fail("That application is gone.");

  try {
    await ApplicationService.markApplied(user.id, parsed.data);
    revalidatePath("/applications");
    revalidatePath("/dashboard");
    return ok(
      "Marked as applied. Your tracker has the date and the resume you used.",
    );
  } catch (error) {
    if (error instanceof NotFoundError) return fail(error.message);
    return unexpected(error, "markAppliedAction");
  }
}

/** Clear saved jobs whose listings have closed. */
export async function removeClosedSavedJobsAction(): Promise<ActionState> {
  const user = await requireUser();
  try {
    const count = await JobService.removeClosedSaved(user.id);
    revalidatePath("/saved");
    return ok(
      count
        ? `Removed ${count} closed listing${count === 1 ? "" : "s"}.`
        : "Nothing closed to remove.",
    );
  } catch (error) {
    return unexpected(error, "removeClosedSavedJobsAction");
  }
}
