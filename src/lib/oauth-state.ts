import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The OAuth round trip's short-lived state, carried in a cookie between
 * "start" and "callback".
 *
 * It holds the per-attempt state, nonce and PKCE verifier, plus where to go
 * afterwards. The cookie is httpOnly, and its contents are HMAC-signed with
 * AUTH_SECRET, so it cannot be forged or edited — a tampered or expired value
 * simply fails to parse, and the sign-in starts over.
 *
 * Pure functions (the secret is a parameter), so they are unit tested directly.
 */

export type OAuthState = {
  state: string;
  nonce: string;
  codeVerifier: string;
  /** Internal path to land on after signing in. */
  returnTo: string;
  /** Epoch milliseconds when the attempt started. */
  issuedAt: number;
};

/** Long enough to pick an account and consent; short enough to be useless later. */
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function sealOAuthState(value: OAuthState, secret: string) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

export function openOAuthState(
  sealed: string | undefined,
  secret: string,
  now = Date.now(),
): OAuthState | null {
  if (!sealed) return null;
  const dot = sealed.lastIndexOf(".");
  if (dot <= 0) return null;

  const payload = sealed.slice(0, dot);
  const given = Buffer.from(sealed.slice(dot + 1));
  const expected = Buffer.from(sign(payload, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }

  try {
    const value = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as OAuthState;
    if (
      typeof value.state !== "string" ||
      typeof value.nonce !== "string" ||
      typeof value.codeVerifier !== "string" ||
      typeof value.issuedAt !== "number"
    ) {
      return null;
    }
    if (
      now - value.issuedAt > OAUTH_STATE_TTL_MS ||
      value.issuedAt > now + 60_000
    ) {
      return null;
    }
    return { ...value, returnTo: safeReturnTo(value.returnTo) };
  } catch {
    return null;
  }
}

/** Constant-time comparison of the state Google echoed back with ours. */
export function statesMatch(a: string | null, b: string) {
  if (!a) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

const DEFAULT_RETURN = "/dashboard";

/**
 * Only same-site, absolute paths are allowed as a destination. Anything that
 * could leave the site — "//evil.com", "/\\evil.com", "https://…", schemes,
 * control characters — falls back to the dashboard. That is what stops the
 * sign-in flow from becoming an open redirect.
 */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) {
    return DEFAULT_RETURN;
  }
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\")
  ) {
    return DEFAULT_RETURN;
  }
  if (/[\u0000-\u001f\\]/.test(value)) return DEFAULT_RETURN;

  // Resolve against a dummy origin: if anything made it leave that origin,
  // or it points back into the sign-in pages, do not use it.
  const url = new URL(value, "https://elara.invalid");
  if (url.origin !== "https://elara.invalid") return DEFAULT_RETURN;
  if (/^\/(login|register|api\/auth)(\/|$)/.test(url.pathname)) {
    return DEFAULT_RETURN;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
