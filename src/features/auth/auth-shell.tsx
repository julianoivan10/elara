import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { Eyebrow } from "@/components/ui/editorial";
import { stages } from "@/config/site";

/**
 * The auth shell: form on the left, a quiet editorial column on the right.
 *
 * The right column stays on paper rather than becoming the usual dark marketing
 * panel — the product is bright, and the sign-in screen is the first time
 * anyone sees that.
 */
export function AuthShell({
  index,
  label,
  title,
  description,
  children,
  footer,
}: {
  index: string;
  label: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_28rem] xl:grid-cols-[minmax(0,1fr)_34rem]">
      {/* --------------------------------------------------------- form */}
      <div className="flex flex-col gutter">
        <header className="flex h-16 shrink-0 items-center">
          <Link
            href="/"
            className="rounded-sm transition-opacity hover:opacity-70"
            aria-label="ELARA home"
          >
            <Wordmark />
          </Link>
        </header>

        <main
          id="main"
          className="flex flex-1 flex-col justify-center py-10 lg:py-16"
        >
          <div className="w-full max-w-[25rem]">
            <div className="flex flex-col gap-3">
              <Eyebrow className="flex items-center gap-2">
                <span data-numeric className="text-ink-ghost">
                  {index}
                </span>
                <span aria-hidden className="h-px w-4 bg-current opacity-40" />
                {label}
              </Eyebrow>

              <h1 className="text-[clamp(1.75rem,1.2rem+1.6vw,2.25rem)] leading-[1.05] tracking-[-0.03em] text-ink">
                {title}
              </h1>

              {description ? (
                <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
                  {description}
                </p>
              ) : null}
            </div>

            <div className="mt-8">{children}</div>

            {footer ? (
              <div className="mt-8 border-t border-rule pt-5 text-[0.8125rem] text-ink-muted">
                {footer}
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {/* -------------------------------------------------------- aside */}
      <aside className="relative hidden border-l border-rule bg-raised/70 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="grid-field pointer-events-none absolute inset-0 opacity-60"
        />

        <div className="relative p-10 xl:p-14">
          <Eyebrow>What is inside</Eyebrow>
          <ol className="mt-6 flex flex-col">
            {stages.map((stage) => (
              <li
                key={stage.key}
                className="flex gap-5 border-t border-rule py-4 last:border-b"
              >
                <span
                  data-numeric
                  className="mt-0.5 font-mono text-[0.6875rem] tracking-[0.1em] text-ink-ghost"
                >
                  {stage.index}
                </span>
                <div className="min-w-0">
                  <p className="text-[0.9375rem] text-ink">{stage.title}</p>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">
                    {stage.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <p className="relative p-10 pt-0 text-[0.8125rem] leading-relaxed text-ink-faint xl:p-14 xl:pt-0">
          Your profile, resumes and applications are yours. Export a PDF at any
          time.
        </p>
      </aside>
    </div>
  );
}
