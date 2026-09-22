/** A listing no sync has confirmed for this long is not shown as live. */
export const STALE_AFTER_DAYS = 14;

export function staleCutoff(now = new Date()) {
  return new Date(now.getTime() - STALE_AFTER_DAYS * 86_400_000);
}
