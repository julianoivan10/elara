import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

/**
 * Badges carry status and metadata. Tones map to the semantic tokens, so the
 * seven application statuses stay distinguishable without inventing new colour.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xs border px-1.5 py-0.5 text-[0.6875rem] font-medium leading-4 tracking-[0.01em]",
  {
    variants: {
      tone: {
        neutral: "border-rule bg-raised text-ink-muted",
        ink: "border-ink bg-ink text-paper",
        cobalt: "border-cobalt-soft bg-cobalt-tint text-cobalt-ink",
        lime: "border-lime-deep/40 bg-lime-tint text-[#4b6106]",
        coral: "border-coral/30 bg-coral-tint text-coral-ink",
        success: "border-success/25 bg-success-tint text-success",
        warning: "border-warning/25 bg-warning-tint text-warning",
        danger: "border-danger/25 bg-danger-tint text-danger",
        info: "border-info/25 bg-info-tint text-info",
        outline: "border-rule-strong bg-transparent text-ink-muted",
      },
      size: {
        sm: "text-[0.625rem] px-1 py-px",
        md: "",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

/** The tones a badge can take, so callers can type their own maps. */
export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
  className,
  tone,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
  );
}

/** A small filled dot — used in legends and status rows next to a label. */
export function Dot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("size-1.5 rounded-full bg-current", className)}
    />
  );
}

export { badgeVariants };
