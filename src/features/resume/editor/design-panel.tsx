"use client";

import Link from "next/link";
import { Check, Target } from "lucide-react";

import { cn } from "@/lib/cn";
import { Eyebrow } from "@/components/ui/editorial";
import {
  RESUME_ACCENTS,
  RESUME_DENSITIES,
  RESUME_FONTS,
  type AccentKey,
  type DensityKey,
  type FontKey,
} from "@/features/resume/document";
import { RESUME_TEMPLATES } from "@/features/resume/templates";

export type ResumeMeta = {
  title: string;
  templateKey: string;
  accentKey: AccentKey;
  fontKey: FontKey;
  density: DensityKey;
};

/**
 * Presentation controls. Everything here changes how the page is set and
 * nothing changes what it says, which is why it is a separate rail from the
 * section list.
 */
export function DesignPanel({
  meta,
  onChange,
  targetJob,
}: {
  meta: ResumeMeta;
  onChange: (patch: Partial<ResumeMeta>) => void;
  targetJob: { id: string; title: string; company: string } | null;
}) {
  return (
    <div className="flex flex-col gap-7">
      {/* ------------------------------------------------------ template */}
      <fieldset className="flex flex-col gap-2">
        <legend className="eyebrow mb-1">Template</legend>
        {RESUME_TEMPLATES.map((template) => {
          const active = template.key === meta.templateKey;
          return (
            <button
              key={template.key}
              type="button"
              onClick={() => onChange({ templateKey: template.key })}
              aria-pressed={active}
              className={cn(
                "flex items-start gap-2.5 rounded-sm border px-3 py-2 text-left transition-colors",
                active
                  ? "border-ink bg-raised/70"
                  : "border-rule hover:border-rule-strong",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border",
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule-strong text-transparent",
                )}
              >
                <Check className="size-2" strokeWidth={4} />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.8125rem] font-medium text-ink">
                  {template.name}
                </span>
                <span className="mt-0.5 block text-[0.6875rem] leading-snug text-ink-muted">
                  {template.bestFor}
                </span>
              </span>
            </button>
          );
        })}
      </fieldset>

      {/* -------------------------------------------------------- accent */}
      <fieldset className="flex flex-col gap-2.5">
        <legend className="eyebrow mb-1">Accent</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(RESUME_ACCENTS) as AccentKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ accentKey: key })}
              aria-pressed={meta.accentKey === key}
              aria-label={RESUME_ACCENTS[key].label}
              title={RESUME_ACCENTS[key].label}
              className={cn(
                "size-6 rounded-full border-2 transition-transform duration-200",
                meta.accentKey === key
                  ? "scale-110 border-ink"
                  : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: RESUME_ACCENTS[key].value }}
            />
          ))}
        </div>
        <p className="text-[0.6875rem] leading-snug text-ink-faint">
          Used on rules and headings only, so the text stays readable in print
          and to a keyword scan.
        </p>
      </fieldset>

      {/* ---------------------------------------------------------- font */}
      <fieldset className="flex flex-col gap-2">
        <legend className="eyebrow mb-1">Typeface</legend>
        <div className="flex gap-1.5">
          {(Object.keys(RESUME_FONTS) as FontKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ fontKey: key })}
              aria-pressed={meta.fontKey === key}
              className={cn(
                "flex-1 rounded-sm border px-2.5 py-1.5 text-[0.8125rem] transition-colors",
                meta.fontKey === key
                  ? "border-ink bg-ink text-paper"
                  : "border-rule text-ink-muted hover:border-rule-strong",
              )}
              style={{ fontFamily: RESUME_FONTS[key].css }}
            >
              {RESUME_FONTS[key].label}
            </button>
          ))}
        </div>
        <p className="text-[0.6875rem] leading-snug text-ink-faint">
          Both are built into the PDF format, so the file opens identically
          everywhere and parses cleanly.
        </p>
      </fieldset>

      {/* ------------------------------------------------------- density */}
      <fieldset className="flex flex-col gap-2">
        <legend className="eyebrow mb-1">Density</legend>
        <div className="flex gap-1.5">
          {(Object.keys(RESUME_DENSITIES) as DensityKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ density: key })}
              aria-pressed={meta.density === key}
              className={cn(
                "flex-1 rounded-sm border px-2 py-1.5 text-[0.75rem] transition-colors",
                meta.density === key
                  ? "border-ink bg-ink text-paper"
                  : "border-rule text-ink-muted hover:border-rule-strong",
              )}
            >
              {RESUME_DENSITIES[key].label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* ---------------------------------------------------- target job */}
      {targetJob ? (
        <div className="flex flex-col gap-2 border-t border-rule pt-5">
          <Eyebrow className="flex items-center gap-1.5">
            <Target className="size-3" />
            Aimed at
          </Eyebrow>
          <Link
            href={`/jobs/${targetJob.id}`}
            className="text-[0.8125rem] leading-snug text-ink hover:underline underline-offset-4"
          >
            {targetJob.title}
            <span className="block text-ink-muted">{targetJob.company}</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
