import * as React from "react";

import {
  displayUrl,
  type ResumeSectionData,
  type ResumeTheme,
} from "@/features/resume/document";
import {
  Bullets,
  EntryHead,
  FAINT,
  HAIRLINE,
  INK,
  InlineList,
  MUTED,
  Paragraph,
  px,
} from "@/features/resume/templates/primitives";

/**
 * How a section's *content* renders, shared by every template.
 *
 * Templates differ in page architecture — where the header sits, how section
 * labels are set, one column or two — not in how an experience entry is
 * structured. Keeping the content renderer in one place is why switching
 * template can never drop or reorder a user's information.
 */
export type ContentVariant = {
  /** Bullet glyph; compact layouts use a smaller mark. */
  marker?: string;
  /** Colour the bullet marker with the accent. */
  accentMarkers?: boolean;
  /** Render skills as one flowing line instead of labelled rows. */
  inlineSkills?: boolean;
  /** Suppress per-entry location lines in tight layouts. */
  hideLocations?: boolean;
};

export function SectionContent({
  section,
  theme,
  variant = {},
}: {
  section: ResumeSectionData;
  theme: ResumeTheme;
  variant?: ContentVariant;
}) {
  const { metrics, accent } = theme;
  const markerColor = variant.accentMarkers ? accent : FAINT;

  const stack = (children: React.ReactNode) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: px(metrics.itemGap),
      }}
    >
      {children}
    </div>
  );

  switch (section.kind) {
    case "SUMMARY":
      return <Paragraph theme={theme}>{section.body}</Paragraph>;

    case "EXPERIENCE":
      return stack(
        section.items.map((item) => (
          <article
            key={item.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: px(metrics.lineGap),
            }}
          >
            <EntryHead
              theme={theme}
              meta={item.period}
              title={
                <>
                  {item.role}
                  <span style={{ fontWeight: 400, color: MUTED }}>
                    {" — "}
                    {item.company}
                  </span>
                </>
              }
            />
            {item.location && !variant.hideLocations ? (
              <span style={{ fontSize: px(metrics.meta), color: FAINT }}>
                {item.location}
              </span>
            ) : null}
            {item.summary ? (
              <Paragraph theme={theme}>{item.summary}</Paragraph>
            ) : null}
            <Bullets
              items={item.highlights}
              theme={theme}
              marker={variant.marker}
              markerColor={markerColor}
            />
          </article>
        )),
      );

    case "EDUCATION":
      return stack(
        section.items.map((item) => (
          <article
            key={item.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: px(metrics.lineGap),
            }}
          >
            <EntryHead theme={theme} title={item.school} meta={item.period} />
            {item.qualification ? (
              <Paragraph theme={theme}>{item.qualification}</Paragraph>
            ) : null}
            {item.detail ? (
              <Paragraph theme={theme}>{item.detail}</Paragraph>
            ) : null}
          </article>
        )),
      );

    case "PROJECTS":
      return stack(
        section.items.map((item) => (
          <article
            key={item.id}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: px(metrics.lineGap),
            }}
          >
            <EntryHead
              theme={theme}
              meta={item.period}
              title={
                <>
                  {item.name}
                  {item.role ? (
                    <span style={{ fontWeight: 400, color: MUTED }}>
                      {" — "}
                      {item.role}
                    </span>
                  ) : null}
                </>
              }
            />
            {item.description ? (
              <Paragraph theme={theme}>{item.description}</Paragraph>
            ) : null}
            <Bullets
              items={item.highlights}
              theme={theme}
              marker={variant.marker}
              markerColor={markerColor}
            />
            {item.technologies.length > 0 ? (
              <InlineList items={item.technologies} theme={theme} />
            ) : null}
            {item.url ? (
              <span style={{ fontSize: px(metrics.meta), color: accent }}>
                {displayUrl(item.url)}
              </span>
            ) : null}
          </article>
        )),
      );

    case "SKILLS": {
      if (variant.inlineSkills) {
        const all = section.groups.flatMap((group) => group.items);
        return <Paragraph theme={theme}>{all.join(" · ")}</Paragraph>;
      }

      return stack(
        section.groups.map((group, i) => (
          <div
            key={group.label ?? i}
            style={{
              display: "flex",
              gap: px(metrics.base * 0.6),
              flexWrap: "wrap",
            }}
          >
            {group.label ? (
              <span
                style={{
                  fontSize: px(metrics.base),
                  fontWeight: 700,
                  color: INK,
                  minWidth: px(metrics.base * 6),
                }}
              >
                {group.label}
              </span>
            ) : null}
            <span
              style={{
                flex: 1,
                minWidth: px(metrics.base * 10),
                fontSize: px(metrics.base),
                lineHeight: metrics.lead,
                color: MUTED,
              }}
            >
              {group.items.join(", ")}
            </span>
          </div>
        )),
      );
    }

    case "CERTIFICATIONS":
    case "LANGUAGES":
    case "ACHIEVEMENTS":
      return stack(
        section.items.map((item) => (
          <div
            key={item.id}
            style={{ display: "flex", flexDirection: "column", gap: px(1) }}
          >
            <EntryHead theme={theme} title={item.primary} meta={item.meta} />
            {item.secondary ? (
              <Paragraph theme={theme}>{item.secondary}</Paragraph>
            ) : null}
          </div>
        )),
      );

    case "LINKS":
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: px(metrics.lineGap),
          }}
        >
          {section.items.map((link) => (
            <div
              key={link.url}
              style={{
                display: "flex",
                gap: px(metrics.base * 0.6),
                fontSize: px(metrics.base),
                borderBottom: `${px(0.5)} solid ${HAIRLINE}`,
                paddingBottom: px(2),
              }}
            >
              <span style={{ color: INK, fontWeight: 700 }}>{link.label}</span>
              <a
                href={link.url}
                style={{ color: accent, textDecoration: "none" }}
              >
                {displayUrl(link.url)}
              </a>
            </div>
          ))}
        </div>
      );
  }
}
