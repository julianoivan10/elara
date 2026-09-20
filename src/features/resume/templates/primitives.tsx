import * as React from "react";

import { PT_TO_PX, type ResumeTheme } from "@/features/resume/document";

/**
 * On-screen resume primitives.
 *
 * Templates style themselves with inline styles derived from point metrics
 * rather than Tailwind classes. The resume is the user's document, not an ELARA
 * surface: it must not inherit the app's palette, and every size has to trace
 * back to the same number the PDF uses.
 */

/** Points to CSS pixels. */
export const px = (pt: number) => `${(pt * PT_TO_PX).toFixed(2)}px`;

export const INK = "#111111";
export const MUTED = "#4a4a4a";
export const FAINT = "#6b6b6b";
export const HAIRLINE = "#d9d9d9";

export type TemplateProps = {
  doc: import("@/features/resume/document").ResumeDocument;
  theme: ResumeTheme;
};

/** A bulleted list of highlights, shared by experience and projects. */
export function Bullets({
  items,
  theme,
  marker = "•",
  markerColor,
}: {
  items: string[];
  theme: ResumeTheme;
  marker?: string;
  markerColor?: string;
}) {
  if (items.length === 0) return null;
  const { metrics } = theme;

  return (
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: px(metrics.lineGap),
      }}
    >
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            gap: px(metrics.base * 0.55),
            fontSize: px(metrics.base),
            lineHeight: metrics.lead,
            color: MUTED,
          }}
        >
          <span
            aria-hidden
            style={{
              color: markerColor ?? FAINT,
              flexShrink: 0,
              lineHeight: metrics.lead,
            }}
          >
            {marker}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Title on the left, dates on the right, sharing a baseline. */
export function EntryHead({
  title,
  meta,
  theme,
  titleColor = INK,
}: {
  title: React.ReactNode;
  meta?: string | null;
  theme: ResumeTheme;
  titleColor?: string;
}) {
  const { metrics } = theme;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: px(metrics.base),
      }}
    >
      <span
        style={{
          fontSize: px(metrics.itemTitle),
          fontWeight: 700,
          color: titleColor,
          lineHeight: 1.25,
        }}
      >
        {title}
      </span>
      {meta ? (
        <span
          style={{
            fontSize: px(metrics.meta),
            color: FAINT,
            flexShrink: 0,
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {meta}
        </span>
      ) : null}
    </div>
  );
}

export function Paragraph({
  children,
  theme,
  color = MUTED,
}: {
  children: React.ReactNode;
  theme: ResumeTheme;
  color?: string;
}) {
  const { metrics } = theme;
  return (
    <p
      style={{
        margin: 0,
        fontSize: px(metrics.base),
        lineHeight: metrics.lead,
        color,
      }}
    >
      {children}
    </p>
  );
}

/** Joins contact details with a separator that survives wrapping. */
export function InlineList({
  items,
  theme,
  separator = "·",
  color = FAINT,
  size,
}: {
  items: string[];
  theme: ResumeTheme;
  separator?: string;
  color?: string;
  size?: number;
}) {
  const { metrics } = theme;
  if (items.length === 0) return null;

  return (
    <p
      style={{
        margin: 0,
        fontSize: px(size ?? metrics.meta),
        lineHeight: 1.5,
        color,
      }}
    >
      {items.map((item, i) => (
        <React.Fragment key={`${item}-${i}`}>
          {i > 0 ? (
            <span style={{ opacity: 0.5 }}>{`  ${separator}  `}</span>
          ) : null}
          {item}
        </React.Fragment>
      ))}
    </p>
  );
}
