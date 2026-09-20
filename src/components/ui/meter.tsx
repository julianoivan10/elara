"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/cn";

/**
 * Career completion, drawn as a row of segments rather than a rounded bar.
 *
 * The segments are the point: completion in ELARA is made of discrete pieces of
 * a profile, so the meter shows how many blocks are filled, not a percentage
 * sliding along a track.
 */
export function CompletionMeter({
  value,
  segments = 20,
  className,
  label,
}: {
  /** 0–100 */
  value: number;
  segments?: number;
  className?: string;
  label?: string;
}) {
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  const filled = Math.round((clamped / 100) * segments);

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      role="meter"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Career profile completion"}
    >
      <div aria-hidden className="flex items-end gap-[3px]">
        {Array.from({ length: segments }, (_, i) => {
          const isFilled = i < filled;
          return (
            <motion.span
              key={i}
              initial={reduced ? false : { scaleY: 0.35, opacity: 0.4 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{
                duration: 0.4,
                delay: reduced ? 0 : i * 0.018,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={cn(
                "h-5 flex-1 origin-bottom rounded-[1px] transition-colors duration-300",
                isFilled ? "bg-ink" : "bg-sunk",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * A hairline progress rule for smaller contexts — section completion, upload
 * state, an AI request in flight.
 */
export function ProgressRule({
  value,
  className,
  tone = "ink",
}: {
  value: number;
  className?: string;
  tone?: "ink" | "cobalt" | "lime";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const bar =
    tone === "cobalt"
      ? "bg-cobalt"
      : tone === "lime"
        ? "bg-lime-deep"
        : "bg-ink";

  return (
    <div
      className={cn(
        "h-0.5 w-full overflow-hidden rounded-full bg-sunk",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn("h-full", bar)}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
