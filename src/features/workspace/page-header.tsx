import { cn } from "@/lib/cn";
import { IndexMarker } from "@/components/ui/editorial";

/**
 * One header for every workspace page, so no page invents its own title
 * treatment. The gutter and max width here define the workspace measure.
 */
export function PageShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[82rem] px-4 py-8 md:px-8 md:py-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  index,
  label,
  title,
  description,
  actions,
  className,
}: {
  index?: string;
  label?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 pb-6", className)}>
      {label ? (
        index ? (
          <IndexMarker index={index} label={label} />
        ) : (
          <span className="eyebrow">{label}</span>
        )
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] leading-[1.1] tracking-[-0.03em] text-ink">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
