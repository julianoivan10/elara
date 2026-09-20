import "server-only";
import bcrypt from "bcryptjs";

/**
 * bcrypt with a cost of 12. Chosen over argon2 because it needs no native
 * toolchain, which keeps `npm install` working identically on every platform.
 */
const COST = 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

/**
 * Burn roughly the same time as a real comparison when the account does not
 * exist, so response timing does not reveal which emails are registered.
 */
const DUMMY_HASH =
  "$2b$12$myVsR.yxRnXeGqePib8C6.rXiohKJlVyMycPrfBYoqX7fGHLnHmqC";

export async function fakeVerify() {
  await bcrypt.compare("not-a-real-password", DUMMY_HASH).catch(() => false);
}
