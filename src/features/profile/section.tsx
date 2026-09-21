"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ActionState } from "@/server/actions/result";

/**
 * A numbered profile section. The index markers here are the same motif used on
 * the landing page and in the resume templates — this is where a reader first
 * meets them as navigation rather than decoration.
 */
export function ProfileSection({
  index,
  title,
  description,
  count,
  action,
  children,
  id,
}: {
  index: string;
  title: string;
  description?: string;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink pb-3">
        <div className="flex min-w-0 items-baseline gap-4">
          <span
            data-numeric
            className="font-mono text-[0.6875rem] tracking-[0.1em] text-ink-ghost"
          >
            {index}
          </span>
          <div className="min-w-0">
            <h2 className="text-[1.0625rem] tracking-[-0.02em] text-ink">
              {title}
              {typeof count === "number" && count > 0 ? (
                <span
                  data-numeric
                  className="ml-2 font-mono text-[0.75rem] text-ink-ghost"
                >
                  {count}
                </span>
              ) : null}
            </h2>
            {description ? (
              <p className="mt-1 max-w-[62ch] text-[0.8125rem] leading-relaxed text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </header>

      <div className="pt-1">{children}</div>
    </section>
  );
}

/**
 * A row in a profile section: the record on the left, its controls on the
 * right. Controls stay visible on touch and appear on hover with a pointer.
 */
export function EntryRow({
  title,
  meta,
  subtitle,
  children,
  controls,
  className,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  controls?: React.ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        // Narrow screens stack the controls under the entry, so four icon
        // buttons do not squeeze the text into a column a few words wide.
        "group flex flex-col gap-2 border-b border-rule py-4 last:border-b-0 sm:flex-row sm:items-start sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-[0.9375rem] font-medium text-ink">{title}</h3>
          {meta ? (
            <span
              data-numeric
              className="shrink-0 font-mono text-[0.6875rem] text-ink-faint"
            >
              {meta}
            </span>
          ) : null}
        </div>

        {subtitle ? (
          <p className="mt-0.5 text-[0.8125rem] text-ink-muted">{subtitle}</p>
        ) : null}

        {children ? <div className="mt-2.5">{children}</div> : null}
      </div>

      {controls ? (
        <div className="-ml-2 flex shrink-0 items-center gap-0.5 opacity-100 sm:ml-0 transition-opacity duration-150 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          {controls}
        </div>
      ) : null}
    </article>
  );
}

/**
 * Move up / move down.
 *
 * Ordering is done with buttons rather than drag so it works from a keyboard,
 * with a screen reader and on a phone. Disabled at the ends instead of hidden,
 * so the control does not jump around.
 */
export function ReorderControls({
  onMove,
  isFirst,
  isLast,
  label,
}: {
  onMove: (direction: "up" | "down") => Promise<ActionState>;
  isFirst: boolean;
  isLast: boolean;
  label: string;
}) {
  const [pending, startTransition] = React.useTransition();
  const { toast } = useToast();

  const move = (direction: "up" | "down") =>
    startTransition(async () => {
      const result = await onMove(direction);
      if (result.status === "error") {
        toast(result.message ?? "Could not move that.", { tone: "error" });
      }
    });

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isFirst || pending}
        onClick={() => move("up")}
        aria-label={`Move ${label} up`}
        title="Move up"
      >
        <ChevronUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isLast || pending}
        onClick={() => move("down")}
        aria-label={`Move ${label} down`}
        title="Move down"
      >
        <ChevronDown />
      </Button>
    </>
  );
}

/** Small bullet list used under experience and project rows. */
export function Highlights({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-2 text-[0.8125rem] leading-relaxed text-ink-muted"
        >
          <span
            aria-hidden
            className="mt-[0.55em] size-1 shrink-0 rounded-full bg-ink-ghost"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-xs border border-rule bg-raised px-1.5 py-0.5 text-[0.6875rem] text-ink-muted"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
