"use client";

import * as React from "react";

import { cn } from "@/lib/cn";
import {
  A4_PX,
  PT_TO_PX,
  type ResumeDocument,
  type ResumeTheme,
} from "@/features/resume/document";
import { getTemplate } from "@/features/resume/templates";

/**
 * The live resume preview: an A4-wide sheet rendered at true size and scaled to
 * fit its container.
 *
 * Laying the page out at its real pixel width (794px at 96dpi) and scaling with
 * a transform is what makes the preview trustworthy — line breaks match the
 * export instead of reflowing with the viewport. Content flows continuously and
 * page boundaries are drawn where the PDF will divide it.
 */
export function ResumePage({
  doc,
  theme,
  templateKey,
  className,
  scale,
  showPageBreaks = true,
}: {
  doc: ResumeDocument;
  theme: ResumeTheme;
  templateKey: string;
  className?: string;
  /** Fixed scale; omit to fit the sheet to its container width. */
  scale?: number;
  showPageBreaks?: boolean;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const sheetRef = React.useRef<HTMLDivElement>(null);

  const [autoScale, setAutoScale] = React.useState(scale ?? 0.48);
  const [sheetHeight, setSheetHeight] = React.useState(A4_PX.height);

  // Fit to container width.
  React.useEffect(() => {
    if (scale !== undefined) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setAutoScale(width / A4_PX.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [scale]);

  // Track how tall the content actually is, to know the page count.
  React.useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setSheetHeight(Math.max(A4_PX.height, entry.contentRect.height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const effective = scale ?? autoScale;
  const { Component } = getTemplate(templateKey);
  const pages = Math.max(1, Math.ceil(sheetHeight / A4_PX.height));

  return (
    <div
      ref={containerRef}
      className={cn("w-full", className)}
      style={{ height: sheetHeight * effective }}
    >
      <div
        className="relative origin-top-left"
        style={{ width: A4_PX.width, transform: `scale(${effective})` }}
      >
        <div
          ref={sheetRef}
          className="bg-white shadow-(--shadow-paper) ring-1 ring-black/[0.07]"
          style={{
            width: A4_PX.width,
            minHeight: A4_PX.height,
            padding: theme.metrics.margin * PT_TO_PX,
            fontFamily: theme.font.css,
            // Resume typography must never inherit the app's brand font.
            color: "#111111",
          }}
        >
          <Component doc={doc} theme={theme} />
        </div>

        {showPageBreaks && pages > 1
          ? Array.from({ length: pages - 1 }, (_, i) => (
              <div
                key={i}
                aria-hidden
                className="pointer-events-none absolute inset-x-0 flex items-center gap-2"
                style={{ top: A4_PX.height * (i + 1) }}
              >
                <span className="h-px flex-1 border-t border-dashed border-coral/60" />
                <span
                  className="font-mono uppercase tracking-[0.14em] text-coral"
                  style={{ fontSize: 11 }}
                >
                  Page {i + 2}
                </span>
              </div>
            ))
          : null}
      </div>
    </div>
  );
}

/**
 * Page count for the current content, so the editor can warn before an export
 * runs onto a second sheet.
 */
export function useResumePageCount(height: number) {
  return Math.max(1, Math.ceil(height / A4_PX.height));
}
