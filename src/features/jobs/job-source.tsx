import { cn } from "@/lib/cn";
import { isProviderKey, PROVIDER_LABEL } from "@/lib/jobs/types";
import { textToBlocks } from "@/lib/jobs/html-text";

/**
 * Where a listing came from, always visible. Adzuna listings carry the
 * attribution Adzuna's terms require ("Jobs by Adzuna", linked).
 */
export function SourceLabel({
  source,
  className,
  long = false,
}: {
  source: string;
  className?: string;
  /** "Source: Greenhouse" rather than "via Greenhouse". */
  long?: boolean;
}) {
  if (source === "adzuna") return <AdzunaAttribution className={className} />;
  const label = isProviderKey(source) ? PROVIDER_LABEL[source] : source;
  return (
    <span className={cn("text-[0.6875rem] text-ink-faint", className)}>
      {long ? "Source: " : "via "}
      <span className="text-ink-muted">{label}</span>
    </span>
  );
}

export function AdzunaAttribution({ className }: { className?: string }) {
  return (
    <a
      href="https://www.adzuna.com"
      target="_blank"
      rel="noopener noreferrer"
      // Adzuna's terms set a minimum size for this label (116×23px).
      className={cn(
        "relative z-10 inline-flex min-h-[23px] min-w-[116px] items-center justify-center rounded-xs border border-rule bg-surface px-2 text-[0.6875rem] font-medium text-ink-muted hover:text-ink",
        className,
      )}
    >
      Jobs by Adzuna
    </a>
  );
}

/**
 * A job description, rendered from the plain block format produced at
 * ingestion (see lib/jobs/html-text.ts). Text nodes only — no HTML from a
 * provider ever reaches the page.
 */
export function JobDescription({ text }: { text: string }) {
  const blocks = textToBlocks(text);
  if (blocks.length === 0) {
    return (
      <p className="text-[0.9375rem] text-ink-muted">
        No description provided.
      </p>
    );
  }

  return (
    <div className="flex max-w-[68ch] flex-col gap-4">
      {blocks.map((block, i) =>
        block.type === "heading" ? (
          <h3
            key={i}
            className="pt-2 text-[1rem] font-medium tracking-[-0.01em] text-ink"
          >
            {block.text}
          </h3>
        ) : block.type === "list" ? (
          <ul key={i} className="flex flex-col gap-2">
            {block.items.map((item, j) => (
              <li
                key={j}
                className="flex gap-3 text-[0.9375rem] leading-relaxed text-ink-muted"
              >
                <span
                  aria-hidden
                  className="mt-[0.6em] size-1 shrink-0 rounded-full bg-ink-ghost"
                />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p
            key={i}
            className="text-[0.9375rem] leading-relaxed text-ink-muted [overflow-wrap:anywhere]"
          >
            {block.text}
          </p>
        ),
      )}
    </div>
  );
}

/** Company monogram: the providers publish no logos, and none are invented. */
export function CompanyMark({
  company,
  className,
}: {
  company: string;
  className?: string;
}) {
  const letters = company
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-sm border border-rule bg-raised font-mono text-[0.6875rem] font-medium text-ink-muted",
        className,
      )}
    >
      {letters || "·"}
    </span>
  );
}
