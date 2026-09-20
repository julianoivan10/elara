import {
  contactLine,
  displayUrl,
  isSectionEmpty,
} from "@/features/resume/document";
import {
  INK,
  InlineList,
  px,
  type TemplateProps,
} from "@/features/resume/templates/primitives";
import { SectionContent } from "@/features/resume/templates/section-content";

/**
 * Compact — for a long record that has to stay on one page. Section titles sit
 * on the same line as a rule that runs to the right margin, skills flow as a
 * single line, and per-entry locations are dropped.
 */
export function CompactTemplate({ doc, theme }: TemplateProps) {
  const { metrics, accent } = theme;
  const sections = doc.sections.filter((s) => !isSectionEmpty(s));

  const contacts = [
    ...contactLine(doc.header),
    ...doc.header.links.map((link) => displayUrl(link.url)),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: px(metrics.base),
          flexWrap: "wrap",
          paddingBottom: px(metrics.base * 0.5),
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

      <div style={{ paddingBottom: px(metrics.base * 0.6) }}>
        <InlineList items={contacts} theme={theme} separator="|" />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: px(metrics.sectionGap),
        }}
      >
        {sections.map((section) => (
          <section
            key={section.kind}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: px(metrics.base * 0.5),
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: px(metrics.base * 0.6),
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: px(metrics.sectionTitle),
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: INK,
                  lineHeight: 1.2,
                  flexShrink: 0,
                }}
              >
                {section.title}
              </h2>
              <span
                aria-hidden
                style={{
                  flex: 1,
                  height: px(0.75),
                  backgroundColor: accent,
                  opacity: 0.4,
                }}
              />
            </div>

            <SectionContent
              section={section}
              theme={theme}
              variant={{ marker: "–", inlineSkills: true, hideLocations: true }}
            />
          </section>
        ))}
      </div>
    </div>
  );
}
