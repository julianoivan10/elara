import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * The ELARA visual motif, as components.
 *
 * Numbered index markers, mono eyebrows and hairline rules are what make the
 * product recognisable with the logo removed. They live here so pages compose
 * them instead of re-inventing a heading style each time.
 */

export function Eyebrow({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("eyebrow", className)} {...props} />;
}

/** "01 / PROFILE" */
export function IndexMarker({
  index,
  label,
  className,
  tone = "faint",
}: {
  index: string;
  label: string;
  className?: string;
  tone?: "faint" | "ink" | "cobalt";
}) {
  const toneClass =
    tone === "ink"
      ? "text-ink"
      : tone === "cobalt"
        ? "text-cobalt-ink"
        : "text-ink-faint";

  return (
    <span
      className={cn(
        "eyebrow inline-flex items-center gap-2",
        toneClass,
        className,
      )}
    >
      <span
        data-numeric
        className={tone === "faint" ? "text-ink-ghost" : undefined}
      >
        {index}
      </span>
      <span aria-hidden className="h-px w-4 bg-current opacity-40" />
      <span>{label}</span>
    </span>
  );
}

/**
 * An oversized numeral used to anchor editorial sections. Decorative: the
 * accessible heading is always the adjacent text.
 */
export function BigNumeral({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-numeric
      className={cn(
        "font-mono text-[clamp(3rem,8vw,6rem)] font-normal leading-[0.8] tracking-[-0.06em] text-sunk",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Rule({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "strong";
}) {
  return (
    <hr
      className={cn(
        "border-0 border-t",
        tone === "strong" ? "border-rule-strong" : "border-rule",
        className,
      )}
    />
  );
}

/**
 * Section header used across the marketing site and the workspace: a numbered
 * eyebrow, a title, and an optional aside on the right.
 */
export function SectionHeading({
  index,
  label,
  title,
  description,
  aside,
  className,
  as: Heading = "h2",
}: {
  index?: string;
  label?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {label ? (
        index ? (
          <IndexMarker index={index} label={label} />
        ) : (
          <Eyebrow>{label}</Eyebrow>
        )
      ) : null}

      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <Heading className="max-w-[18ch] text-section text-ink">
          {title}
        </Heading>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>

      {description ? (
        <p className="max-w-[58ch] text-[0.9375rem] leading-relaxed text-ink-muted">
          {description}
        </p>
      ) : null}
    </div>
  );
}
