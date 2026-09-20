import * as React from "react";

import { cn } from "@/lib/cn";
import { Eyebrow } from "@/components/ui/editorial";

/**
 * Panels are the workspace's container primitive. They are bordered, not
 * shadowed — depth in ELARA comes from paper (the resume preview), never from
 * floating cards.
 */
export function Panel({
  className,
  inset = false,
  ...props
}: React.ComponentProps<"section"> & { inset?: boolean }) {
  return (
    <section
      className={cn(
        "rounded-lg border border-rule",
        inset ? "bg-raised" : "bg-surface",
        className,
      )}
      {...props}
    />
  );
}

export function PanelHeader({
  label,
  title,
  action,
  className,
}: {
  label?: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-4 border-b border-rule px-5 py-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {label ? <Eyebrow>{label}</Eyebrow> : null}
        <h2 className="truncate text-[0.9375rem] font-medium text-ink">
          {title}
        </h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function PanelBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

/**
 * Empty states are a product surface, not a fallback. Each one names the thing
 * that is missing and offers the single action that fixes it.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-md border border-dashed border-rule-strong px-5 py-7",
        className,
      )}
    >
      {icon ? (
        <span className="flex size-8 items-center justify-center rounded-sm bg-raised text-ink-faint [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <p className="text-[0.9375rem] font-medium text-ink">{title}</p>
        {description ? (
          <p className="max-w-[46ch] text-[0.8125rem] leading-relaxed text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
