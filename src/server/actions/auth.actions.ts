"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";

import { db } from "@/server/db";
import {
  hashPassword,
  verifyPassword,
  fakeVerify,
} from "@/server/auth/password";
import {
  createSession,
  destroyOtherSessions,
  destroySession,
  getSessionUser,
  SESSION_COOKIE,
} from "@/server/auth/session";
import { createToken, hashToken, TOKEN_TTL } from "@/server/auth/tokens";
import { LIMITS, rateLimit } from "@/server/rate-limit";
import { clientKey } from "@/server/request";
import { EmailService } from "@/services/email.service";
import { logError } from "@/server/log";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/auth";
import { fail, fromZod, ok, type ActionState } from "@/server/actions/result";
import { unexpected } from "@/server/actions/unexpected";

/* ------------------------------------------------------------------ helpers */

function limited(retryAfterSeconds: number): ActionState {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return fail(
    `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
  );
}

async function issueToken(
  userId: string,
  type: "EMAIL_VERIFY" | "PASSWORD_RESET",
) {
  const token = createToken(32);

  // Only one live token of a kind per user: issuing a new link retires the old.
  await db.verificationToken.deleteMany({
    where: { userId, type, consumedAt: null },
  });

  await db.verificationToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL[type]),
    },
  });

  return token;
}

/* ----------------------------------------------------------------- register */

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const gate = rateLimit(
    await clientKey("register"),
    LIMITS.register.limit,
    LIMITS.register.windowMs,
  );
  if (!gate.ok) return limited(gate.retryAfterSeconds);

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  const { name, email, password } = parsed.data;

  // Which step was running when something failed, for the server log.
  let stage = "create-user";

  try {
    const user = await db.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        // The profile is created with the account so the workspace always has
        // somewhere to write to.
        profile: { create: { fullName: name } },
      },
      select: { id: true, name: true, email: true },
    });

    stage = "create-session";
    await createSession(user.id);

    // The account exists and the person is signed in. A confirmation email that
    // fails to go out must not turn that into an error: they can resend it from
    // the workspace banner.
    try {
      const token = await issueToken(user.id, "EMAIL_VERIFY");
      await EmailService.sendVerification(user.email, user.name, token);
    } catch (error) {
      logError("registerAction", error, { stage: "send-verification" });
    }
  } catch (error) {
    // P2002 is the unique constraint on email.
    //
    // Registration does disclose that an address is taken. That is a deliberate
    // trade: the alternative ("check your inbox" for an address that already
    // exists) strands people who simply forgot they had signed up. The rate
    // limit above is what stops it being a usable enumeration oracle.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return fail("An account already uses that email address.", {
        email: "Try logging in instead.",
      });
    }
    return unexpected(error, "registerAction", { stage });
  }

  redirect("/dashboard?welcome=1");
}

/* -------------------------------------------------------------------- login */

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  const { email, password } = parsed.data;

  // Keyed by address as well as IP, so one account cannot be locked out from a
  // shared network and one IP cannot spray many accounts.
  const gate = rateLimit(
    `${await clientKey("login")}:${email}`,
    LIMITS.login.limit,
    LIMITS.login.windowMs,
  );
  if (!gate.ok) return limited(gate.retryAfterSeconds);

  const invalid = fail("That email and password do not match.");

  // Which step was running when something failed, for the server log.
  let stage = "find-user";

  try {
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    // A missing account, and an account with no password (it signs in with
    // Google), get the same answer after the same amount of work, so neither
    // is distinguishable from a wrong password.
    if (!user?.passwordHash) {
      await fakeVerify();
      return invalid;
    }

    stage = "verify-password";
    if (!(await verifyPassword(password, user.passwordHash))) return invalid;

    stage = "create-session";
    await createSession(user.id);
  } catch (error) {
    return unexpected(error, "loginAction", { stage });
  }

  redirect("/dashboard");
}

/* ------------------------------------------------------------------- logout */

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

/* ----------------------------------------------------------- password reset */

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  const gate = rateLimit(
    `${await clientKey("reset")}:${parsed.data.email}`,
    LIMITS.passwordReset.limit,
    LIMITS.passwordReset.windowMs,
  );

  // The same answer either way. Whether an address has an account must not be
  // learnable here — including from a different rate-limit message.
  const generic = ok(
    "If that address has an account, a reset link is on its way.",
  );
  if (!gate.ok) return generic;

  try {
    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, name: true, email: true },
    });

    if (user) {
      const token = await issueToken(user.id, "PASSWORD_RESET");
      await EmailService.sendPasswordReset(user.email, user.name, token);
    }
  } catch (error) {
    logError("forgotPasswordAction", error);
  }

  return generic;
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  try {
    const record = await db.verificationToken.findUnique({
      where: { tokenHash: hashToken(parsed.data.token) },
      select: {
        id: true,
        userId: true,
        type: true,
        expiresAt: true,
        consumedAt: true,
      },
    });

    if (
      !record ||
      record.type !== "PASSWORD_RESET" ||
      record.consumedAt ||
      record.expiresAt.getTime() < Date.now()
    ) {
      return fail(
        "That reset link has expired or has already been used. Request a new one.",
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);

    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      db.verificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      // Changing a password ends every existing session, including any an
      // attacker may be holding.
      db.session.deleteMany({ where: { userId: record.userId } }),
    ]);

    await createSession(record.userId);
  } catch (error) {
    return unexpected(error, "resetPasswordAction");
  }

  redirect("/dashboard");
}

/* ------------------------------------------------------- email verification */

export async function verifyEmailAction(token: string): Promise<ActionState> {
  try {
    const record = await db.verificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
      select: {
        id: true,
        userId: true,
        type: true,
        expiresAt: true,
        consumedAt: true,
      },
    });

    if (!record || record.type !== "EMAIL_VERIFY") {
      return fail("That confirmation link is not valid.");
    }

    if (record.consumedAt) {
      return ok("This address is already confirmed.");
    }

    if (record.expiresAt.getTime() < Date.now()) {
      return fail(
        "That confirmation link has expired. Send yourself a new one.",
      );
    }

    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      db.verificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    return ok("Your email is confirmed.");
  } catch (error) {
    return unexpected(error, "verifyEmailAction");
  }
}

export async function resendVerificationAction(): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return fail("Log in first.");
  if (user.emailVerifiedAt) return ok("Your email is already confirmed.");

  const gate = rateLimit(
    `verify:${user.id}`,
    LIMITS.passwordReset.limit,
    LIMITS.passwordReset.windowMs,
  );
  if (!gate.ok) return limited(gate.retryAfterSeconds);

  try {
    const token = await issueToken(user.id, "EMAIL_VERIFY");
    await EmailService.sendVerification(user.email, user.name, token);
    return ok(`Confirmation sent to ${user.email}.`);
  } catch (error) {
    return unexpected(error, "resendVerificationAction");
  }
}

/* ------------------------------------------------------------------ account */

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return fail("Log in first.");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 10) {
    return fail("Check the highlighted fields.", {
      password: "Use at least 10 characters.",
    });
  }
  if (next !== confirm) {
    return fail("Check the highlighted fields.", {
      confirm: "Both passwords need to match.",
    });
  }

  try {
    const record = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    // An account that signs in with Google has no current password to
    // prove. Adding one goes through the reset link instead, which proves
    // control of the inbox rather than trusting a session alone.
    if (record && !record.passwordHash) {
      return fail(
        "Your account signs in with Google and has no password yet. To add one, use “Forgot password” on the login page and follow the link we email you.",
      );
    }

    if (
      !record?.passwordHash ||
      !(await verifyPassword(current, record.passwordHash))
    ) {
      return fail("Check the highlighted fields.", {
        current: "That is not your current password.",
      });
    }

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(next) },
    });

    // Keep this device signed in; end the others.
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    await destroyOtherSessions(user.id, token);

    return ok("Password updated. Other devices have been signed out.");
  } catch (error) {
    return unexpected(error, "changePasswordAction");
  }
}
