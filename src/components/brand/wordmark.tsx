import { cn } from "@/lib/cn";

/**
 * The ELARA mark: three rules of unequal length — a written page — with the
 * middle one carrying a lime block, the same highlighter used throughout the
 * product. It is the rule motif compressed into 16px.
 */
export function Mark({
  className,
  accent = true,
}: {
  className?: string;
  accent?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={cn("size-4 shrink-0", className)}
    >
      <rect x="0" y="2.5" width="16" height="2" rx="0.5" fill="currentColor" />
      <rect x="0" y="7" width="9" height="2" rx="0.5" fill="currentColor" />
      <rect x="0" y="11.5" width="13" height="2" rx="0.5" fill="currentColor" />
      {accent ? (
        <rect
          x="11"
          y="7"
          width="5"
          height="2"
          rx="0.5"
          className="fill-lime-deep"
        />
      ) : null}
    </svg>
  );
}

export function Wordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <Mark className={markClassName} />
      <span className="text-[1.0625rem] font-medium lowercase tracking-[-0.045em]">
        elara
      </span>
    </span>
  );
}
