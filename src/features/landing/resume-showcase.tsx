"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";

import { cn } from "@/lib/cn";
import { SectionHeading } from "@/components/ui/editorial";
import {
  RESUME_ACCENTS,
  RESUME_DENSITIES,
  resolveTheme,
  type AccentKey,
  type DensityKey,
} from "@/features/resume/document";
import { RESUME_TEMPLATES } from "@/features/resume/templates";
import { ResumePage } from "@/features/resume/resume-page";
import { demoResume } from "@/features/resume/demo-document";

/**
 * The template showcase renders the *real* templates from the real registry
 * against the real document model. Switching a template here does exactly what
 * switching it in the editor does — which is the point being made: one set of
 * facts, four presentations.
 */
export function ResumeShowcase() {
  const [templateKey, setTemplateKey] = React.useState("editorial");
  const [accentKey, setAccentKey] = React.useState<AccentKey>("cobalt");
  const [density, setDensity] = React.useState<DensityKey>("regular");

  const theme = React.useMemo(
    () => resolveTheme({ accentKey, density, fontKey: "sans" }),
    [accentKey, density],
  );

  const active =
    RESUME_TEMPLATES.find((t) => t.key === templateKey) ?? RESUME_TEMPLATES[0];

  return (
    <section
      id="resume"
      className="scroll-mt-20 border-t border-rule bg-raised/60 py-20 md:py-28"
    >
      <div className="gutter mx-auto max-w-[90rem]">
        <SectionHeading
          index="03"
          label="Resume"
          title="One set of facts. Four ways to set it."
          description="Templates change presentation, never content. Switch whenever you like — nothing you wrote gets rearranged or lost."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* ------------------------------------------------- controls */}
          <div className="flex flex-col gap-8 lg:col-span-5">
            <fieldset className="flex flex-col gap-2">
              <legend className="eyebrow mb-2">Template</legend>
              {RESUME_TEMPLATES.map((template) => {
                const isActive = template.key === templateKey;
                return (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => setTemplateKey(template.key)}
                    aria-pressed={isActive}
                    className={cn(
                      "group relative flex items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors duration-200",
                      isActive
                        ? "border-ink bg-surface"
                        : "border-rule bg-transparent hover:border-rule-strong hover:bg-surface/60",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isActive
                          ? "border-ink bg-ink text-paper"
                          : "border-rule-strong text-transparent",
                      )}
                    >
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="text-[0.9375rem] font-medium text-ink">
                          {template.name}
                        </span>
                        <span className="eyebrow shrink-0">
                          {template.bestFor}
                        </span>
                      </span>
                      <span className="mt-1 block text-[0.8125rem] leading-relaxed text-ink-muted">
                        {template.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </fieldset>

            <div className="grid gap-6 sm:grid-cols-2">
              <fieldset>
                <legend className="eyebrow mb-3">Accent</legend>
                <div className="flex gap-2">
                  {(Object.keys(RESUME_ACCENTS) as AccentKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAccentKey(key)}
                      aria-pressed={accentKey === key}
                      aria-label={RESUME_ACCENTS[key].label}
                      title={RESUME_ACCENTS[key].label}
                      className={cn(
                        "size-7 rounded-full border-2 transition-transform duration-200",
                        accentKey === key
                          ? "scale-110 border-ink"
                          : "border-transparent hover:scale-105",
                      )}
                      style={{ backgroundColor: RESUME_ACCENTS[key].value }}
                    />
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="eyebrow mb-3">Density</legend>
                <div className="flex gap-1.5">
                  {(Object.keys(RESUME_DENSITIES) as DensityKey[]).map(
                    (key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDensity(key)}
                        aria-pressed={density === key}
                        className={cn(
                          "rounded-sm border px-2.5 py-1 text-[0.75rem] transition-colors",
                          density === key
                            ? "border-ink bg-ink text-paper"
                            : "border-rule bg-surface text-ink-muted hover:border-rule-strong",
                        )}
                      >
                        {RESUME_DENSITIES[key].label}
                      </button>
                    ),
                  )}
                </div>
              </fieldset>
            </div>

            <p className="border-t border-rule pt-5 text-[0.8125rem] leading-relaxed text-ink-muted">
              Every template exports to a real A4 PDF with selectable text and
              working links — not a picture of a web page.
            </p>
          </div>

          {/* -------------------------------------------------- preview */}
          <div className="lg:col-span-7">
            <div className="mx-auto max-w-[30rem] lg:max-w-none">
              <div className="mb-3 flex items-center justify-between">
                <span className="eyebrow">{active.name} · A4</span>
                <span className="eyebrow">Live preview</span>
              </div>

              <motion.div
                key={`${templateKey}-${accentKey}-${density}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <ResumePage
                  doc={demoResume}
                  theme={theme}
                  templateKey={templateKey}
                  showPageBreaks={false}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
