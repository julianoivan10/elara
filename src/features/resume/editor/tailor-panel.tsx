"use client";

import { cn } from "@/lib/cn";
import { Eyebrow } from "@/components/ui/editorial";
import { ProgressRule } from "@/components/ui/meter";
import type { ProjectionProfile } from "@/features/resume/project-document";

/**
 * What the target posting asks for, checked against the profile.
 *
 * The comparison is exact skill names, case-insensitive — simple enough to
 * explain in one line, which matters because the result is shown to the person
 * as fact rather than as a score. A missing skill is never added for them.
 */
export function TailorPanel({
  targetJob,
  profile,
}: {
  targetJob: { skills: string[]; requirements: string[] };
  profile: ProjectionProfile | null;
}) {
  const have = new Set(
    (profile?.skills ?? []).map((skill) => skill.name.toLowerCase().trim()),
  );

  const asks = targetJob.skills.map((skill) => ({
    label: skill,
    matched: have.has(skill.toLowerCase().trim()),
  }));

  const matched = asks.filter((ask) => ask.matched).length;
  const percent = asks.length ? Math.round((matched / asks.length) * 100) : 0;

  if (asks.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 border-t border-rule pt-5">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>Against the posting</Eyebrow>
        <span data-numeric className="font-mono text-[0.75rem] text-ink">
          {matched}/{asks.length}
        </span>
      </div>

      <ProgressRule value={percent} tone="lime" />

      <ul className="flex flex-wrap gap-1.5">
        {asks.map((ask) => (
          <li
            key={ask.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xs border px-1.5 py-0.5 text-[0.6875rem]",
              ask.matched
                ? "border-lime-deep/40 bg-lime-tint text-[#4b6106]"
                : "border-dashed border-rule-strong text-ink-faint",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-1 rounded-full",
                ask.matched ? "bg-lime-deep" : "bg-ink-ghost",
              )}
            />
            {ask.label}
          </li>
        ))}
      </ul>

      <p className="text-[0.6875rem] leading-snug text-ink-faint">
        Dashed items are not on your profile. Add one only if it is genuinely
        true of you — ELARA will not add it for you.
      </p>
    </section>
  );
}
