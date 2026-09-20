"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { destroySession } from "@/server/auth/session";
import { verifyPassword } from "@/server/auth/password";
import {
  fail,
  ok,
  unexpected,
  type ActionState,
} from "@/server/actions/result";

const nameSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(80),
});

export async function updateAccountNameAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return fail("Check the highlighted fields.", {
      name: parsed.error.issues[0].message,
    });
  }

  try {
    await db.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name },
    });

    revalidatePath("/settings", "layout");
    return ok("Name updated.");
  } catch (error) {
    return unexpected(error, "updateAccountNameAction");
  }
}

/**
 * Deleting an account removes the profile, resumes, saved jobs, applications
 * and notes with it — every relation cascades from User in the schema, so there
 * is nothing left behind to clean up later.
 *
 * It asks for the password, because this is the one action in the product that
 * cannot be undone.
 */
export async function deleteAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm") ?? "").trim();

  if (confirmation !== "delete my account") {
    return fail("Type the confirmation exactly as shown.", {
      confirm: 'Type "delete my account" to confirm.',
    });
  }

  try {
    const record = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    if (!record || !(await verifyPassword(password, record.passwordHash))) {
      return fail("That password is not right.", {
        password: "That password is not right.",
      });
    }

    await db.user.delete({ where: { id: user.id } });
    await destroySession();
  } catch (error) {
    return unexpected(error, "deleteAccountAction");
  }

  redirect("/");
}
