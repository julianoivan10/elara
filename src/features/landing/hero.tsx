import Link from "next/link";
import { ArrowDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { stages } from "@/config/site";
import { HeroDocument } from "@/features/landing/hero-document";

/**
 * Asymmetric hero: seven columns of type against five of paper.
 *
 * The composition, not a gradient, does the work — a wide left column of
 * display type, a hairline stage rail underneath, and the document sitting
 * slightly low and slightly turned, as if placed on the desk.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* The structural grid, masked so it fades before it becomes decoration. */}
      <div
        aria-hidden
        className="grid-field pointer-events-none absolute inset-x-0 top-0 h-[36rem] opacity-[0.55]"
      />

      <div className="gutter relative mx-auto max-w-[90rem] pb-16 pt-12 md:pb-24 md:pt-20 lg:pb-28 lg:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-10">
          {/* ------------------------------------------------------ type */}
          <div className="min-w-0 lg:col-span-7 lg:pr-8">
            <p className="eyebrow flex items-center gap-2.5">
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-lime-deep"
              />
              A career workspace
            </p>

            <h1 className="mt-6 text-display text-ink">
              Build what
              <br />
              comes <span className="marker">next.</span>
            </h1>

            <p className="mt-7 max-w-[46ch] text-lead text-ink-muted">
              Your career profile, resumes, job search and applications in one
              place — so every application starts from something you have
              already written down, not a blank page.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <Link href="/register">Create your profile</Link>
              </Button>

              <Button asChild size="lg" variant="ghost" className="group">
                <a href="#how">
                  See how it works
                  <ArrowDown className="transition-transform duration-300 ease-out-soft group-hover:translate-y-0.5" />
                </a>
              </Button>
            </div>

            {/* The 01–05 motif, introduced here and repeated through the product. */}
            <div className="mt-12 border-t border-rule pt-4 lg:mt-16">
              <ul className="scrollbar-none -mx-1 flex gap-x-6 gap-y-2 overflow-x-auto px-1 md:flex-wrap md:overflow-visible">
                {stages.map((stage) => (
                  <li
                    key={stage.key}
                    className="eyebrow flex shrink-0 items-center gap-2"
                  >
                    <span data-numeric className="text-ink-ghost">
                      {stage.index}
                    </span>
                    <span>{stage.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* -------------------------------------------------- document */}
          <div className="min-w-0 lg:col-span-5 lg:pl-4">
            <HeroDocument />
          </div>
        </div>
      </div>
    </section>
  );
}
