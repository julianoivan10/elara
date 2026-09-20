import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { stages } from "@/config/site";

/**
 * 404. The numbered rail keeps the page recognisably ELARA rather than a bare
 * error, and gives someone who took a wrong turn somewhere useful to go.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="gutter mx-auto flex h-16 w-full max-w-[90rem] items-center">
        <Link href="/" aria-label="ELARA home" className="hover:opacity-70">
          <Wordmark />
        </Link>
      </header>

      <main
        id="main"
        className="gutter mx-auto flex w-full max-w-[90rem] flex-1 flex-col justify-center py-20"
      >
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow" data-numeric>
              404
            </p>

            <h1 className="mt-6 text-title text-ink">
              That page is not <span className="marker">here.</span>
            </h1>

            <p className="mt-6 max-w-[48ch] text-lead text-ink-muted">
              The link may be old, or the item may have been deleted. Nothing on
              your profile is affected.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              <Button asChild size="lg">
                <Link href="/dashboard">Go to your workspace</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/">Back to the start</Link>
              </Button>
            </div>
          </div>

          <ol className="flex flex-col justify-end lg:col-span-4 lg:col-start-9">
            {stages.map((stage) => (
              <li
                key={stage.key}
                className="border-t border-rule last:border-b"
              >
                <Link
                  href={stage.href}
                  className="flex items-baseline gap-4 py-3 transition-colors hover:text-ink"
                >
                  <span
                    data-numeric
                    className="font-mono text-[0.6875rem] tracking-[0.1em] text-ink-ghost"
                  >
                    {stage.index}
                  </span>
                  <span className="text-[0.9375rem] text-ink-muted transition-colors hover:text-ink">
                    {stage.label}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
