import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { env, isGoogleConfigured } from "@/lib/env";
import {
  appOrigin,
  buildAuthorizationUrl,
  createAuthorizationSecrets,
} from "@/server/auth/google";
import {
  OAUTH_STATE_TTL_MS,
  safeReturnTo,
  sealOAuthState,
} from "@/lib/oauth-state";
import {
  GOOGLE_STATE_COOKIE,
  GOOGLE_STATE_COOKIE_PATH,
} from "@/app/api/auth/google/state-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 1 of Google sign-in: remember this attempt's secrets in a signed,
 * httpOnly cookie and send the browser to Google's consent screen.
 *
 * GET /api/auth/google?next=/some/path
 */
export async function GET(request: NextRequest) {
  if (!isGoogleConfigured) redirect("/login?error=google_unavailable");

  // The state cookie must be set on the same host Google will redirect back
  // to (APP_URL). If this request arrived on another host — a preview URL, a
  // domain alias — restart the flow on the canonical one first.
  const canonical = appOrigin();
  if (request.nextUrl.origin !== canonical) {
    redirect(
      `${canonical}${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
  }

  const secrets = createAuthorizationSecrets();
  const store = await cookies();
  store.set(
    GOOGLE_STATE_COOKIE,
    sealOAuthState(
      {
        ...secrets,
        returnTo: safeReturnTo(request.nextUrl.searchParams.get("next")),
        issuedAt: Date.now(),
      },
      env.AUTH_SECRET,
    ),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // Lax, not Strict: the callback is a top-level navigation *from Google*,
      // and a Strict cookie would not be sent on it.
      sameSite: "lax",
      path: GOOGLE_STATE_COOKIE_PATH,
      maxAge: OAUTH_STATE_TTL_MS / 1000,
    },
  );

  redirect(buildAuthorizationUrl(secrets));
}
