"use client";

import * as React from "react";

import type { ActionState } from "@/server/actions/result";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave for the resume editor.
 *
 * Writes are keyed, so edits to different things queue independently while
 * repeated edits to the same thing collapse into one request — typing a section
 * title is a single write, not one per keystroke. The hook reports a single
 * status for the whole editor, which is what the header needs to show.
 */
export function useAutosave(delay = 650) {
  const [inFlight, setInFlight] = React.useState(0);
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);

  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // Guards against a slow earlier save landing after a newer one for the same
  // key and reporting stale state.
  const generation = React.useRef(new Map<string, number>());

  const run = React.useCallback(
    async (key: string, save: () => Promise<ActionState | void>) => {
      const gen = (generation.current.get(key) ?? 0) + 1;
      generation.current.set(key, gen);

      setInFlight((count) => count + 1);
      setStatus("saving");

      try {
        const result = await save();
        if (generation.current.get(key) !== gen) return;

        if (result && result.status === "error") {
          setError(result.message ?? "Could not save.");
          setStatus("error");
        } else {
          setError(null);
          setSavedAt(new Date());
          setStatus("saved");
        }
      } catch {
        if (generation.current.get(key) !== gen) return;
        setError("Could not reach the server. Your changes are not saved.");
        setStatus("error");
      } finally {
        setInFlight((count) => Math.max(0, count - 1));
      }
    },
    [],
  );

  /** Queue a save, replacing any pending save for the same key. */
  const schedule = React.useCallback(
    (key: string, save: () => Promise<ActionState | void>) => {
      setStatus("saving");

      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);

      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          void run(key, save);
        }, delay),
      );
    },
    [delay, run],
  );

  /** Save now — used for reordering and for anything that must not be lost. */
  const flush = React.useCallback(
    (key: string, save: () => Promise<ActionState | void>) => {
      const existing = timers.current.get(key);
      if (existing) {
        clearTimeout(existing);
        timers.current.delete(key);
      }
      void run(key, save);
    },
    [run],
  );

  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  // Warn before leaving with an edit still queued or in flight.
  React.useEffect(() => {
    const unsaved = () => timers.current.size > 0 || inFlight > 0;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!unsaved()) return;
      event.preventDefault();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [inFlight]);

  return { schedule, flush, status, error, savedAt };
}
