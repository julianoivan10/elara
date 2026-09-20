import {
  contactLine,
  displayUrl,
  isSectionEmpty,
} from "@/features/resume/document";
import {
  FAINT,
  INK,
  InlineList,
  px,
  type TemplateProps,
} from "@/features/resume/templates/primitives";
import { SectionContent } from "@/features/resume/templates/section-content";

/**
 * Editorial — section labels sit out in the left margin beside a numeral, the
 * way a well-set document numbers its parts. The label and its content stay
 * adjacent in reading order, so the side-set labels cost nothing in parsing.
 */
export function EditorialTemplate({ doc, theme }: TemplateProps) {
  const { metrics, accent } = theme;
  const sections = doc.sections.filter((s) => !isSectionEmpty(s));

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: px(metrics.base * 0.4),
          paddingBottom: px(metrics.base * 0.9),
          borderBottom: `${px(1.5)} solid ${accent}`,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: px(metrics.name),
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            fontWeight: 700,
            color: INK,
          }}
        >
          {doc.header.name}
        </h1>
        {doc.header.headline ? (
          <p
            style={{
              margin: 0,
              fontSize: px(metrics.headline),
              lineHeight: 1.3,
              color: accent,
            }}
          >
            {doc.header.headline}
          </p>
        ) : null}
      </header>

      <div
        style={{
          paddingTop: px(metrics.base * 0.55),
          display: "flex",
          flexDirection: "column",
          gap: px(metrics.base * 0.3),
        }}
      >
        <InlineList items={contactLine(doc.header)} theme={theme} />
        {doc.header.links.length > 0 ? (
          <InlineList
            theme={theme}
            items={doc.header.links.map(
              (link) => `${link.label}: ${displayUrl(link.url)}`,
            )}
          />
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: px(metrics.sectionGap),
          paddingTop: px(metrics.sectionGap),
        }}
      >
        {sections.map((section, index) => (
          <section
            key={section.kind}
            style={{ display: "flex", gap: px(metrics.base * 1.1) }}
          >
            <div
              style={{
                width: px(metrics.base * 8.5),
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                gap: px(2),
                paddingTop: px(1),
              }}
            >
              <span
                style={{
                  fontSize: px(metrics.sectionTitle * 0.9),
                  letterSpacing: "0.12em",
                  color: FAINT,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: px(metrics.sectionTitle),
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: INK,
                  lineHeight: 1.3,
                }}
              >
                {section.title}
              </h2>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <SectionContent
                section={section}
                theme={theme}
                variant={{ accentMarkers: true }}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
