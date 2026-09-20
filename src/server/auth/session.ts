import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";

import { db } from "@/server/db";
import { createToken, hashToken, TOKEN_TTL } from "@/server/auth/tokens";

export const SESSION_COOKIE = "elara_session";

/**
 * A readable companion flag carrying no secret and granting no access. It exists
 * so the marketing pages can stay fully static: the navbar swaps its call to
 * action on the client instead of forcing a session lookup on every visit.
 */
export const SESSION_HINT_COOKIE = "elara_signed_in";

/**
 * Sessions are opaque random tokens stored hashed in the database, not signed
 * JWTs, so a session can be revoked server-side the moment a user logs out.
 */
export async function createSession(userId: string) {
  const token = createToken(32);
  const expiresAt = new Date(Date.now() + TOKEN_TTL.SESSION);

  const userAgent = (await headers()).get("user-agent")?.slice(0, 255) ?? null;

  await db.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt, userAgent },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  store.set(SESSION_HINT_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await db.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
  }

  store.delete(SESSION_COOKIE);
  store.delete(SESSION_HINT_COOKIE);
}

/** Drop every other session — used after a password change. */
export async function destroyOtherSessions(userId: string, keepToken?: string) {
  await db.session.deleteMany({
    where: {
      userId,
      ...(keepToken ? { NOT: { tokenHash: hashToken(keepToken) } } : {}),
    },
  });
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt: Date | null;
  profileId: string | null;
};

/**
 * Resolve the current user. `cache` dedupes this across a single render pass,
 * so a layout and its pages share one query.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          emailVerifiedAt: true,
          profile: { select: { id: true } },
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    // Expired: clean up lazily rather than running a scheduled job.
    await db.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined);
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    emailVerifiedAt: session.user.emailVerifiedAt,
    profileId: session.user.profile?.id ?? null,
  };
});
