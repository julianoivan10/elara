import {
  contactLine,
  displayUrl,
  isSectionEmpty,
  type ResumeSectionData,
} from "@/features/resume/document";
import {
  FAINT,
  INK,
  px,
  type TemplateProps,
} from "@/features/resume/templates/primitives";
import { SectionContent } from "@/features/resume/templates/section-content";

/**
 * Modern — a narrow supporting column beside the main record.
 *
 * Skills, education, languages and certifications move to the sidebar so the
 * experience gets the width it needs. The sidebar renders *after* the main
 * column in the markup and is placed with flex order, which keeps the document's
 * reading order Experience-first for anything parsing the text.
 */
const SIDEBAR_KINDS: ResumeSectionData["kind"][] = [
  "SKILLS",
  "EDUCATION",
  "LANGUAGES",
  "CERTIFICATIONS",
  "LINKS",
];

export function ModernTemplate({ doc, theme }: TemplateProps) {
  const { metrics, accent } = theme;
  const sections = doc.sections.filter((s) => !isSectionEmpty(s));

  const main = sections.filter((s) => !SIDEBAR_KINDS.includes(s.kind));
  const aside = sections.filter((s) => SIDEBAR_KINDS.includes(s.kind));

  const heading = (title: string, color = INK) => (
    <h2
      style={{
        margin: 0,
        fontSize: px(metrics.sectionTitle),
        letterSpacing: "0.11em",
        textTransform: "uppercase",
        fontWeight: 700,
        color,
        lineHeight: 1.3,
        paddingBottom: px(3),
        borderBottom: `${px(1)} solid ${accent}`,
      }}
    >
      {title}
    </h2>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: px(metrics.base * 0.35),
          paddingBottom: px(metrics.sectionGap),
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: px(metrics.name),
            lineHeight: 1.05,
            letterSpacing: "-0.015em",
            fontWeight: 700,
            color: accent,
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
              color: INK,
            }}
          >
            {doc.header.headline}
          </p>
        ) : null}
      </header>

      <div style={{ display: "flex", gap: px(metrics.base * 1.8) }}>
        {/* Main column first in the markup — reading order follows it. */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            order: 2,
            display: "flex",
            flexDirection: "column",
            gap: px(metrics.sectionGap),
          }}
        >
          {main.map((section) => (
            <section
              key={section.kind}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: px(metrics.base * 0.6),
              }}
            >
              {heading(section.title)}
              <SectionContent
                section={section}
                theme={theme}
                variant={{ accentMarkers: true }}
              />
            </section>
          ))}
        </div>

        <aside
          style={{
            width: "33%",
            flexShrink: 0,
            order: 1,
            display: "flex",
            flexDirection: "column",
            gap: px(metrics.sectionGap),
          }}
        >
          <section
            style={{
              display: "flex",
              flexDirection: "column",
              gap: px(metrics.base * 0.5),
            }}
          >
            {heading("Contact")}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: px(2),
                fontSize: px(metrics.meta),
                lineHeight: 1.5,
                color: FAINT,
              }}
            >
              {contactLine(doc.header).map((item) => (
                <span key={item}>{item}</span>
              ))}
              {doc.header.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  style={{ color: accent, textDecoration: "none" }}
                >
                  {displayUrl(link.url)}
                </a>
              ))}
            </div>
          </section>

          {aside.map((section) => (
            <section
              key={section.kind}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: px(metrics.base * 0.5),
              }}
            >
              {heading(section.title)}
              <SectionContent
                section={section}
                theme={theme}
                variant={{ inlineSkills: true, hideLocations: true }}
              />
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}
