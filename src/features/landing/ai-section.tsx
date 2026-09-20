import { ArrowRight } from "lucide-react";

import { SectionHeading } from "@/components/ui/editorial";
import { demoBullet } from "@/features/landing/demo-data";

/**
 * The assistant section leads with the constraint rather than the capability.
 *
 * "It will not invent your record" is the honest and more interesting claim, and
 * it is a real product rule enforced in the AI service prompts — not a marketing
 * line. The before/after uses one genuine resume bullet so the difference is
 * legible instead of asserted.
 */
const GUARANTEES = [
  {
    index: "01",
    title: "It never adds a fact",
    body: "No invented employers, degrees, dates or certifications. If something is not in your profile, it does not appear in your resume.",
  },
  {
    index: "02",
    title: "It never invents a number",
    body: "Metrics are the first thing a rewrite wants to fabricate. ELARA leaves a gap and asks you for the figure instead.",
  },
  {
    index: "03",
    title: "You approve every change",
    body: "Suggestions arrive beside your text, not in place of it. Nothing is written to your resume until you accept it.",
  },
];

export function AiSection() {
  return (
    <section
      id="ai"
      className="gutter mx-auto max-w-[90rem] scroll-mt-20 py-20 md:py-28"
    >
      <SectionHeading
        index="04"
        label="Assistant"
        title="It sharpens your wording. It will not invent your record."
        description="Most of what makes a resume weak is phrasing, not substance — responsibilities where results belong. That is the part a model can genuinely help with."
      />

      <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-rule bg-rule lg:grid-cols-2">
        {/* ------------------------------------------------------- before */}
        <div className="flex flex-col gap-3 bg-surface p-6 md:p-8">
          <span className="eyebrow">What you wrote</span>
          <p className="text-[1.0625rem] leading-relaxed text-ink-faint">
            {demoBullet.before}
          </p>
        </div>

        {/* -------------------------------------------------------- after */}
        <div className="relative flex flex-col gap-3 bg-surface p-6 md:p-8">
          <span
            aria-hidden
            className="absolute -left-px top-1/2 hidden size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-paper text-ink-faint lg:flex"
          >
            <ArrowRight className="size-3.5" />
          </span>

          <span className="eyebrow text-cobalt-ink">Sharpened</span>
          <p className="text-[1.0625rem] leading-relaxed text-ink">
            Rebuilt the shared component library{" "}
            <span className="marker">adopted by four product teams</span>, and
            wrote the migration guide they shipped against.
          </p>

          <ul className="mt-2 flex flex-col gap-1.5 border-t border-rule pt-4">
            {demoBullet.notes.map((note) => (
              <li
                key={note}
                className="flex items-baseline gap-2 text-[0.8125rem] text-ink-muted"
              >
                <span
                  aria-hidden
                  className="size-1 shrink-0 translate-y-[-2px] rounded-full bg-lime-deep"
                />
                {note}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ------------------------------------------------------ guarantees */}
      <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-3">
        {GUARANTEES.map((item) => (
          <li
            key={item.index}
            className="flex flex-col gap-2 border-t border-ink pt-4"
          >
            <span className="eyebrow flex items-center gap-2">
              <span data-numeric className="text-ink-ghost">
                {item.index}
              </span>
              <span aria-hidden className="h-px w-3 bg-current opacity-40" />
            </span>
            <p className="text-[0.9375rem] font-medium text-ink">
              {item.title}
            </p>
            <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
