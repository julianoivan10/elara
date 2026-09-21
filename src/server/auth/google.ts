import "server-only";
import {
  createHash,
  createPublicKey,
  randomBytes,
  verify,
  type JsonWebKey,
} from "node:crypto";

import { env, isGoogleConfigured } from "@/lib/env";

/**
 * Google sign-in: OAuth 2.0 authorization code flow with PKCE, and OpenID
 * Connect for identity.
 *
 * This file speaks the protocol and nothing else. It never touches the
 * database or the session; see google-account.ts for what a verified identity
 * means for an ELARA account, and app/api/auth/google for the two routes.
 *
 * Everything here runs server-side. GOOGLE_CLIENT_SECRET is read from env.ts,
 * which is "server-only", so it cannot reach a client bundle.
 */

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

/** Tolerance for clock drift between this server and Google's. */
const CLOCK_SKEW_S = 60;

export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

/**
 * The redirect URI registered in Google Cloud Console. Built from APP_URL, not
 * from the request, so a spoofed Host header cannot change where Google sends
 * the code — and so the value is the same one every time.
 */
export function googleRedirectUri() {
  return new URL(GOOGLE_CALLBACK_PATH, appOrigin()).toString();
}

export function appOrigin() {
  return new URL(env.APP_URL).origin;
}

export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

/* --------------------------------------------------------- authorization */

/** Fresh per-attempt secrets: state (CSRF), nonce (replay), PKCE verifier. */
export function createAuthorizationSecrets() {
  return {
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    // RFC 7636: 43 to 128 characters from the unreserved set.
    codeVerifier: randomBytes(48).toString("base64url"),
  };
}

export function buildAuthorizationUrl({
  state,
  nonce,
  codeVerifier,
}: ReturnType<typeof createAuthorizationSecrets>) {
  if (!isGoogleConfigured)
    throw new GoogleAuthError("Google is not configured.");

  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: createHash("sha256")
      .update(codeVerifier)
      .digest("base64url"),
    code_challenge_method: "S256",
    // Always show the account chooser, so someone signed in to several Google
    // accounts picks one deliberately.
    prompt: "select_account",
  }).toString();
  return url.toString();
}

/* ---------------------------------------------------------- token exchange */

/** Exchange the authorization code for an ID token (server to server). */
export async function exchangeCode(code: string, codeVerifier: string) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as {
    id_token?: string;
    error?: string;
  };

  if (!response.ok || !body.id_token) {
    // `error` is an OAuth error code such as "invalid_grant"; it carries no
    // secret and is what makes a failed exchange diagnosable.
    throw new GoogleAuthError(
      `Token exchange failed (${response.status}${body.error ? ` ${body.error}` : ""}).`,
    );
  }

  return body.id_token;
}

/* --------------------------------------------------------- ID token checks */

export type GoogleIdentity = {
  /** Stable, unique Google account identifier. */
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

type Jwk = JsonWebKey & { kid?: string };
let jwksCache: { keys: Jwk[]; expiresAt: number } | null = null;

async function signingKey(kid: string): Promise<Jwk> {
  const cached = jwksCache?.keys.find((k) => k.kid === kid);
  if (cached && jwksCache!.expiresAt > Date.now()) return cached;

  // Unknown key id or stale cache: Google rotates keys, so refetch once.
  const response = await fetch(JWKS_URL, {
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new GoogleAuthError(
      `Could not fetch Google keys (${response.status}).`,
    );
  }
  const { keys } = (await response.json()) as { keys: Jwk[] };
  const maxAge = Number(
    response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? 3600,
  );
  jwksCache = { keys, expiresAt: Date.now() + maxAge * 1000 };

  const key = keys.find((k) => k.kid === kid);
  if (!key) throw new GoogleAuthError("ID token signed with an unknown key.");
  return key;
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
}

/**
 * Verify an ID token fully: signature against Google's published keys, then
 * issuer, audience, expiry and the nonce this attempt sent.
 *
 * The token came straight from Google's token endpoint over TLS, which the
 * OpenID Connect spec accepts as proof of origin on its own. The signature is
 * checked anyway, so the claims are never trusted on transport alone.
 */
export async function verifyIdToken(
  idToken: string,
  expectedNonce: string,
  now = Date.now(),
): Promise<GoogleIdentity> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new GoogleAuthError("Malformed ID token.");
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = decodeSegment<{ alg?: string; kid?: string }>(headerB64);
  if (header.alg !== "RS256" || !header.kid) {
    throw new GoogleAuthError(`Unexpected ID token algorithm (${header.alg}).`);
  }

  const key = createPublicKey({
    key: await signingKey(header.kid),
    format: "jwk",
  });
  const valid = verify(
    "RSA-SHA256",
    Buffer.from(`${headerB64}.${payloadB64}`),
    key,
    Buffer.from(signatureB64, "base64url"),
  );
  if (!valid) throw new GoogleAuthError("ID token signature is invalid.");

  return checkClaims(decodeSegment(payloadB64), expectedNonce, now);
}

/** The claim rules, separate from the signature so they can be unit tested. */
export function checkClaims(
  claims: Record<string, unknown>,
  expectedNonce: string,
  now = Date.now(),
): GoogleIdentity {
  const seconds = Math.floor(now / 1000);

  if (!ISSUERS.has(String(claims.iss))) {
    throw new GoogleAuthError("ID token issuer is not Google.");
  }
  // `aud` may be a string or an array; either way it must name this client.
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!env.GOOGLE_CLIENT_ID || !audience.includes(env.GOOGLE_CLIENT_ID)) {
    throw new GoogleAuthError("ID token was issued to a different client.");
  }
  if (typeof claims.exp !== "number" || claims.exp + CLOCK_SKEW_S < seconds) {
    throw new GoogleAuthError("ID token has expired.");
  }
  if (typeof claims.iat === "number" && claims.iat - CLOCK_SKEW_S > seconds) {
    throw new GoogleAuthError("ID token was issued in the future.");
  }
  if (typeof claims.nonce !== "string" || claims.nonce !== expectedNonce) {
    throw new GoogleAuthError("ID token nonce does not match this sign-in.");
  }
  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new GoogleAuthError("ID token has no subject.");
  }
  if (typeof claims.email !== "string" || !claims.email.includes("@")) {
    throw new GoogleAuthError("ID token has no email address.");
  }

  return {
    sub: claims.sub,
    email: claims.email.trim().toLowerCase(),
    // Google sends a boolean; older tokens used the string "true".
    emailVerified:
      claims.email_verified === true || claims.email_verified === "true",
    name:
      typeof claims.name === "string" && claims.name.trim()
        ? claims.name.trim()
        : null,
  };
}
