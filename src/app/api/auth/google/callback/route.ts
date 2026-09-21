import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { env, isGoogleConfigured } from "@/lib/env";
import { exchangeCode, verifyIdToken } from "@/server/auth/google";
import {
  GoogleAccountError,
  resolveGoogleUser,
} from "@/server/auth/google-account";
import { createSession } from "@/server/auth/session";
import { LIMITS, rateLimit } from "@/server/rate-limit";
import { clientKey } from "@/server/request";
import { logError } from "@/server/log";
import { openOAuthState, statesMatch } from "@/lib/oauth-state";
import type { OAuthErrorCode } from "@/features/auth/oauth-errors";
import {
  GOOGLE_STATE_COOKIE,
  GOOGLE_STATE_COOKIE_PATH,
} from "@/app/api/auth/google/state-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const failed = (code: OAuthErrorCode) => `/login?error=${code}`;

/**
 * Step 2 of Google sign-in. Google redirects here with `code` and `state`.
 *
 * Order matters: the state is checked before anything is sent to Google, the
 * ID token is verified before anything is read from it, and the session is
 * created only once an ELARA user has been resolved. Every failure lands on
 * the login page with a short code, never with an error detail.
 *
 * GET /api/auth/google/callback
 */
export async function GET(request: NextRequest) {
  const destination = await handle(request);
  // Outside any try/catch: redirect() works by throwing.
  redirect(destination);
}

async function handle(request: NextRequest): Promise<string> {
  const params = request.nextUrl.searchParams;
  const store = await cookies();
  const saved = openOAuthState(
    store.get(GOOGLE_STATE_COOKIE)?.value,
    env.AUTH_SECRET,
  );

  // Single use: whatever happens next, this attempt's secrets are spent.
  store.set(GOOGLE_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: GOOGLE_STATE_COOKIE_PATH,
    maxAge: 0,
  });

  if (!isGoogleConfigured) return failed("google_unavailable");

  const gate = rateLimit(
    await clientKey("oauth"),
    LIMITS.oauth.limit,
    LIMITS.oauth.windowMs,
  );
  if (!gate.ok) return failed("google_rate_limited");

  // The person backed out on Google's screen: not an error worth logging.
  const providerError = params.get("error");
  if (providerError === "access_denied") return failed("google_cancelled");
  if (providerError) {
    logError(
      "googleCallback",
      new Error(`Google returned error=${providerError}`),
      {
        stage: "authorize",
      },
    );
    return failed("google_failed");
  }

  // Missing, forged, expired or mismatched state: this callback was not the
  // continuation of a sign-in this browser started. Never exchange the code.
  if (!saved || !statesMatch(params.get("state"), saved.state)) {
    return failed("google_expired");
  }

  const code = params.get("code");
  if (!code) return failed("google_failed");

  let stage = "exchange";
  try {
    const idToken = await exchangeCode(code, saved.codeVerifier);

    stage = "verify";
    const identity = await verifyIdToken(idToken, saved.nonce);

    stage = "resolve-user";
    const { userId, outcome } = await resolveGoogleUser(identity);

    stage = "create-session";
    await createSession(userId);

    return outcome === "created" ? "/dashboard?welcome=1" : saved.returnTo;
  } catch (error) {
    if (error instanceof GoogleAccountError) return failed("google_unverified");
    logError("googleCallback", error, { stage });
    return failed("google_failed");
  }
}
