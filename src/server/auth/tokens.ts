import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Secrets that travel (session cookies, email links) are high-entropy random
 * strings. Only their SHA-256 digest is stored, so a database leak does not hand
 * an attacker a working session or a valid reset link.
 */
export function createToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison for equal-length digests. */
export function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const TOKEN_TTL = {
  /** Email verification links stay valid for a day. */
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  /** Password resets are deliberately short-lived. */
  PASSWORD_RESET: 60 * 60 * 1000,
  /** Sessions last a month, refreshed on use. */
  SESSION: 30 * 24 * 60 * 60 * 1000,
} as const;
