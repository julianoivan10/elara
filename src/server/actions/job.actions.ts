"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { JobService } from "@/services/job.service";
import { ApplicationService } from "@/services/application.service";
import {
  fail,
  ok,
  unexpected,
  type ActionState,
} from "@/server/actions/result";

/** Save or unsave a job. One button, one action, reported back to the caller. */
export async function toggleSavedJobAction(
  jobId: string,
): Promise<ActionState & { saved?: boolean }> {
  const user = await requireUser();

  try {
    const exists = await db.job.findUnique({
      where: { id: jobId },
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
