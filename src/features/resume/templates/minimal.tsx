import {
  contactLine,
  displayUrl,
  isSectionEmpty,
} from "@/features/resume/document";
import {
  HAIRLINE,
  INK,
  InlineList,
  MUTED,
  px,
  type TemplateProps,
} from "@/features/resume/templates/primitives";
import { SectionContent } from "@/features/resume/templates/section-content";

/**
 * Minimal — a centred header, no accent colour beyond a single hairline, and
 * space doing the separating. The safest template to send anywhere.
 */
export function MinimalTemplate({ doc, theme }: TemplateProps) {
  const { metrics } = theme;
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
          flexDirection: "column",
          alignItems: "center",
          gap: px(metrics.base * 0.45),
          textAlign: "center",
          paddingBottom: px(metrics.sectionGap),
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: px(metrics.name),
            lineHeight: 1.1,
            letterSpacing: "0.02em",
            fontWeight: 400,
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
              lineHeight: 1.35,
              color: MUTED,
            }}
          >
            {doc.header.headline}
          </p>
        ) : null}
        <InlineList items={contacts} theme={theme} separator="·" />
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: px(metrics.sectionGap * 1.15),
          borderTop: `${px(0.75)} solid ${HAIRLINE}`,
          paddingTop: px(metrics.sectionGap),
        }}
      >
        {sections.map((section) => (
          <section
            key={section.kind}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: px(metrics.base * 0.75),
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: px(metrics.sectionTitle),
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 400,
                color: INK,
                lineHeight: 1.3,
              }}
            >
              {section.title}
            </h2>
            <SectionContent section={section} theme={theme} />
          </section>
        ))}
      </div>
    </div>
  );
}
