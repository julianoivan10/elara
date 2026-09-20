import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client address for rate-limit keys. Falls back to a constant so
 * the limiter still degrades to a global bucket rather than failing open.
 */
export async function clientKey(prefix: string) {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "unknown";
  return `${prefix}:${ip}`;
}
