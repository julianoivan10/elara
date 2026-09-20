"use client";

import * as React from "react";

/**
 * Values that only exist in the browser.
 *
 * Reading `document.cookie` or calling `Date.now()` during render is impure and
 * differs between the server pass and hydration. `useSyncExternalStore` is the
 * supported way to express it: the server snapshot is the safe default, and the
 * client subscribes to the real value.
 */

const noopSubscribe = () => () => {};

/** True once hydrated; false on the server and during the first client render. */
export function useHydrated() {
  return React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/**
 * Whether a date is in the past.
 *
 * Renders as "not past" on the server, then settles to the truth on the client.
 * Used for "this interview date has gone by", where being briefly optimistic is
 * better than a hydration mismatch.
 */
export function useIsPast(date: Date | null | undefined) {
  const hydrated = useHydrated();
  // Read the clock once, in a lazy initialiser, rather than on every render.
  // Until hydration the answer is "not past", so the server pass never uses it.
  const [now] = React.useState(() => Date.now());

  if (!hydrated || !date) return false;
  return new Date(date).getTime() < now;
}

/**
 * Reads the public "you have a session" flag. Carries no identity and grants
 * nothing — it exists so marketing pages can stay statically rendered while
 * still greeting a signed-in visitor.
 */
export function useSignedInHint() {
  return React.useSyncExternalStore(
    noopSubscribe,
    () =>
      document.cookie
        .split("; ")
        .some((entry) => entry.startsWith("elara_signed_in=1")),
    () => false,
  );
}
