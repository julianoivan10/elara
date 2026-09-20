import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { stages } from "@/config/site";

/**
 * The closing beat. Type carries it — an oversized line, a single lime mark and
 * one rule — so the composition reads as ELARA with the wordmark removed.
 */
export function FinalCta() {
  return (
    <section className="gutter mx-auto max-w-[90rem] py-24 md:py-32">
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="eyebrow flex items-center gap-2.5">
            <span aria-hidden className="size-1.5 rounded-full bg-lime-deep" />
            Start with one thing
          </p>

          <h2 className="mt-6 max-w-[14ch] text-title text-ink">
            Write it down <span className="marker">once.</span>
          </h2>

          <p className="mt-6 max-w-[48ch] text-lead text-ink-muted">
            Add a role, a project, a course — whatever you have. Everything else
            in ELARA is built from that, and it is yours to export whenever you
            want it.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="group">
              <Link href="/register">
                Create your profile
                <ArrowRight className="transition-transform duration-300 ease-out-soft group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/jobs">Browse openings first</Link>
            </Button>
          </div>
        </div>

        {/* The workflow one last time, set as a numbered column. */}
        <ol className="flex flex-col justify-end lg:col-span-4">
          {stages.map((stage) => (
            <li
              key={stage.key}
              className="flex items-baseline gap-4 border-t border-rule py-3 last:border-b"
            >
              <span
                data-numeric
                className="font-mono text-[0.6875rem] tracking-[0.1em] text-ink-ghost"
              >
                {stage.index}
              </span>
              <span className="text-[0.9375rem] text-ink">{stage.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
