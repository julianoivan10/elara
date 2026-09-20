import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/server/db";
import { getSessionUser, type SessionUser } from "@/server/auth/session";

/** Route guard for everything under the workspace shell. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireGuest() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
}

/**
 * The career profile is created with the account, but this keeps the workspace
 * resilient if a row is ever missing.
 */
export const requireProfile = cache(async () => {
  const user = await requireUser();

  const profile = await db.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, fullName: user.name },
    select: { id: true },
  });

  return { user, profileId: profile.id };
});

/**
 * Every mutation on a user-owned row goes through an ownership check. Thrown as
 * a typed error so actions can turn it into a message instead of a stack trace.
 */
export class AuthorizationError extends Error {
  constructor(message = "You do not have access to this item.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "That item no longer exists.") {
    super(message);
    this.name = "NotFoundError";
  }
}
