"use client";

import * as React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/cn";
import { stages } from "@/config/site";
import { SectionHeading } from "@/components/ui/editorial";
import { STAGE_VISUALS } from "@/features/landing/stage-visuals";

/**
 * The workflow, as one object that changes rather than five cards in a row.
 *
 * Radix Tabs in vertical orientation gives arrow-key navigation and the correct
 * tab/tabpanel semantics; nothing auto-advances, because a carousel that moves
 * while you are reading is a worse experience than one you drive.
 */
export function HowItWorks() {
  const [active, setActive] = React.useState<string>(stages[0].key);
  const reduced = useReducedMotion();
  const stage = stages.find((s) => s.key === active) ?? stages[0];

  return (
    <section
      id="how"
      className="gutter mx-auto max-w-[90rem] scroll-mt-20 py-20 md:py-28"
    >
      <SectionHeading
        index="02"
        label="How it works"
        title="One workspace, five moves."
        description="Each stage feeds the next. Write your career down once and the rest of the product has something to work with."
      />

      <Tabs.Root
        value={active}
        onValueChange={setActive}
        orientation="vertical"
        className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12"
      >
        {/* --------------------------------------------------- stage list */}
        <Tabs.List
          aria-label="Workflow stages"
          className="flex min-w-0 flex-col lg:col-span-5"
        >
          {stages.map((item) => {
            const isActive = item.key === active;
            return (
              <Tabs.Trigger
                key={item.key}
                value={item.key}
                className={cn(
                  "group relative border-t border-rule py-4 text-left outline-none last:border-b",
                  "transition-colors duration-200",
                )}
              >
                {/* The active marker: an ink rule that grows from the left. */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute -top-px left-0 h-px w-full origin-left bg-ink transition-transform duration-500 ease-out-soft",
                    isActive ? "scale-x-100" : "scale-x-0",
                  )}
                />

                <div className="flex items-baseline gap-4">
                  <span
                    data-numeric
                    className={cn(
                      "font-mono text-[0.6875rem] tracking-[0.1em] transition-colors",
                      isActive ? "text-ink" : "text-ink-ghost",
                    )}
                  >
                    {item.index}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-[1.0625rem] tracking-[-0.02em] transition-colors md:text-[1.25rem]",
                        isActive
                          ? "text-ink"
                          : "text-ink-faint group-hover:text-ink-muted",
                      )}
                    >
                      {item.title}
                    </p>

                    <div
                      className={cn(
                        "grid transition-[grid-template-rows,opacity] duration-400 ease-out-soft",
                        isActive
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <p className="overflow-hidden text-[0.875rem] leading-relaxed text-ink-muted">
                        <span className="block pt-2">{item.description}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        {/* ------------------------------------------------------- visual */}
        <div className="min-w-0 lg:col-span-7">
          <div className="relative overflow-hidden rounded-lg border border-rule bg-paper">
            <div className="flex items-center justify-between border-b border-rule px-4 py-2.5">
              <span className="eyebrow">
                {stage.index} / {stage.label}
              </span>
              <span aria-hidden className="flex gap-1">
                {stages.map((s) => (
                  <span
                    key={s.key}
                    className={cn(
                      "h-1 rounded-full transition-all duration-400 ease-out-soft",
                      s.key === active ? "w-5 bg-ink" : "w-1 bg-rule-strong",
                    )}
                  />
                ))}
              </span>
            </div>

            {/* Radix unmounts the inactive panels, so each one animates on mount. */}
            {stages.map((s) => {
              const Visual = STAGE_VISUALS[s.key];
              return (
                <Tabs.Content
                  key={s.key}
                  value={s.key}
                  className="outline-none"
                >
                  <motion.div
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                    className="min-h-[19rem] p-5 sm:p-6"
                  >
                    {Visual ? <Visual /> : null}
                  </motion.div>
                </Tabs.Content>
              );
            })}
          </div>
        </div>
      </Tabs.Root>
    </section>
  );
}
