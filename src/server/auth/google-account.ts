import "server-only";
import { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import type { GoogleIdentity } from "@/server/auth/google";

/**
 * What a verified Google identity means for an ELARA account.
 *
 * Resolution order:
 *   1. This Google account is already linked       → sign in as that user.
 *   2. An ELARA user has the same (verified) email  → link Google to them.
 *   3. Nobody has it                                → create a user.
 *
 * Matching is by Google's `sub`, never by email alone, once linked. Email is
 * only used to find an existing account the first time, and only when Google
 * says the address is verified — an unverified email proves nothing about who
 * owns it, so it can neither link nor create.
 */

export const GOOGLE = "google";

export type GoogleSignIn = {
  userId: string;
  outcome: "signed-in" | "linked" | "created";
};

export class GoogleAccountError extends Error {
  constructor(readonly code: "unverified_email") {
    super(code);
    this.name = "GoogleAccountError";
  }
}

export async function resolveGoogleUser(
  identity: GoogleIdentity,
  retrying = false,
): Promise<GoogleSignIn> {
  const linked = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: GOOGLE,
        providerAccountId: identity.sub,
      },
    },
    select: { userId: true },
  });
  if (linked) return { userId: linked.userId, outcome: "signed-in" };

  if (!identity.emailVerified) throw new GoogleAccountError("unverified_email");

  const existing = await db.user.findUnique({
    where: { email: identity.email },
    select: { id: true, emailVerifiedAt: true },
  });

  try {
    if (existing) {
      await linkToExisting(existing, identity);
      return { userId: existing.id, outcome: "linked" };
    }

    const user = await db.user.create({
      data: {
        email: identity.email,
        name: displayName(identity),
        // No password: this account signs in with Google. One can be added
        // later through "Forgot password", which proves the same inbox.
        passwordHash: null,
        // Google verified the address; asking the person to confirm it again
        // would add nothing.
        emailVerifiedAt: new Date(),
        profile: { create: { fullName: displayName(identity) } },
        accounts: {
          create: {
            provider: GOOGLE,
            providerAccountId: identity.sub,
            email: identity.email,
          },
        },
      },
      select: { id: true },
    });
    return { userId: user.id, outcome: "created" };
  } catch (error) {
    // Two callbacks for the same person raced (double-click, two tabs): one
    // won the unique constraint. Resolve again and take whatever now exists.
    if (
      !retrying &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return resolveGoogleUser(identity, true);
    }
    throw error;
  }
}

/**
 * Attach Google to an account that already uses this email.
 *
 * If that account never confirmed its address, whoever registered it had not
 * shown they own the inbox — Google just has. Keeping their password would let
 * someone who pre-registered a victim's address keep a way in after the real
 * owner arrives. So in that case the password and every session are removed
 * in the same transaction as the link; the owner can set a new password via
 * "Forgot password". A confirmed account keeps its password untouched.
 */
async function linkToExisting(
  user: { id: string; emailVerifiedAt: Date | null },
  identity: GoogleIdentity,
) {
  const link = db.account.create({
    data: {
      userId: user.id,
      provider: GOOGLE,
      providerAccountId: identity.sub,
      email: identity.email,
    },
  });

  if (user.emailVerifiedAt) {
    await link;
    return;
  }

  await db.$transaction([
    link,
    db.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), passwordHash: null },
    }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.verificationToken.deleteMany({ where: { userId: user.id } }),
  ]);
}

function displayName(identity: GoogleIdentity) {
  const name = identity.name ?? identity.email.split("@")[0];
  return name.slice(0, 80);
}
