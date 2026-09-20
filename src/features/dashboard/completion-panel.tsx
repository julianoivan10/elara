"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/cn";
import { CompletionMeter } from "@/components/ui/meter";
import type { Completion } from "@/lib/completion";

/**
 * Career completion.
 *
 * The number is set large because it is the one figure worth looking at, and
 * the three suggestions under it are the heaviest unfinished items — so the
 * advice is always the advice that moves the number most.
 */
export function CompletionPanel({ completion }: { completion: Completion }) {
  const reduced = useReducedMotion();
  const done = completion.items.filter((item) => item.done).length;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6 border-b border-ink pb-5">
        <div className="flex items-end gap-4">
          <motion.span
            data-numeric
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="font-mono text-[clamp(3rem,7vw,4.5rem)] font-normal leading-[0.8] tracking-[-0.05em] text-ink"
          >
            {completion.percent}
            <span className="text-ink-ghost">%</span>
          </motion.span>

          <p className="pb-1 text-[0.8125rem] leading-snug text-ink-muted">
            of your career
            <br />
            profile is complete
          </p>
        </div>

        <span
          data-numeric
          className="pb-1 font-mono text-[0.6875rem] tracking-[0.1em] text-ink-faint"
        >
          {done}/{completion.items.length}
        </span>
      </div>

      <CompletionMeter value={completion.percent} segments={28} />

      {completion.next.length > 0 ? (
        <ul className="flex flex-col">
          {completion.next.map((item) => (
            <li key={item.key} className="border-b border-rule last:border-b-0">
              <Link
                href={item.href}
                className="group flex items-start gap-3 py-3 transition-colors"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-rule-strong transition-colors group-hover:border-ink"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.875rem] font-medium text-ink">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-muted">
                    {item.hint}
                  </span>
                </span>
                <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-ink-ghost transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 rounded-md border border-success/25 bg-success-tint px-3 py-2.5 text-[0.8125rem] text-success">
          <Check className="size-3.5 shrink-0" />
          Your profile is complete. Everything here is ready to build a resume
          from.
        </p>
      )}
    </section>
  );
}

/** The full checklist, shown on the profile page. */
export function CompletionChecklist({
  completion,
}: {
  completion: Completion;
}) {
  return (
    <ul className="flex flex-col">
      {completion.items.map((item) => (
        <li
          key={item.key}
          className="flex items-start gap-3 border-b border-rule py-2.5 last:border-b-0"
        >
          <span
            aria-hidden
            className={cn(
              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
              item.done
                ? "border-ink bg-ink text-paper"
                : "border-rule-strong text-transparent",
            )}
          >
            <Check className="size-2.5" strokeWidth={3} />
          </span>
          <span
            className={cn(
              "flex-1 text-[0.8125rem]",
              item.done ? "text-ink-faint line-through" : "text-ink",
            )}
          >
            {item.label}
          </span>
          <span
            data-numeric
            className="font-mono text-[0.6875rem] text-ink-ghost"
          >
            {item.weight}
          </span>
        </li>
      ))}
    </ul>
  );
}
