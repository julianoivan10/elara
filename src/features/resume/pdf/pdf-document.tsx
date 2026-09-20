import * as React from "react";
import {
  Document,
  Font,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  contactLine,
  displayUrl,
  isSectionEmpty,
  type ResumeDocument,
  type ResumeSectionData,
  type ResumeTheme,
} from "@/features/resume/document";
import { toLatin1Document } from "@/features/resume/pdf/latin1";

/**
 * The PDF renderer.
 *
 * react-pdf draws real text at real point sizes, so the export is a proper
 * document — selectable, searchable, with working links and correct A4
 * geometry — rather than a picture of a web page.
 *
 * It consumes the same ResumeDocument and the same point metrics as the
 * on-screen templates, which is what keeps the preview honest. Only the
 * primitives differ, because react-pdf has its own.
 *
 * Only the two PDF core font families are used (Helvetica and Times). They
 * embed nothing, render identically in every reader, and are what an applicant
 * tracking system parses most reliably.
 */

/**
 * react-pdf hyphenates long words at line breaks by default, which on a resume
 * turns "TypeScript" into "TypeS-cript" and puts stray hyphens through skill
 * lists. Returning the word whole disables it document-wide.
 */
Font.registerHyphenationCallback((word) => [word]);

const INK = "#111111";
const MUTED = "#3f3f3f";
const FAINT = "#6b6b6b";
const HAIRLINE = "#d9d9d9";

type Props = { doc: ResumeDocument; theme: ResumeTheme; templateKey: string };

export function ResumePdf({ doc: input, theme, templateKey }: Props) {
  // The core fonts encode Latin-1 only, so typographic punctuation is folded
  // once here rather than at every Text node.
  const doc = toLatin1Document(input);

  const Template =
    templateKey === "minimal"
      ? MinimalPdf
      : templateKey === "modern"
        ? ModernPdf
        : templateKey === "compact"
          ? CompactPdf
          : EditorialPdf;

  const title = doc.header.name ? `${doc.header.name} - Resume` : "Resume";

  return (
    <Document
      title={title}
      author={doc.header.name || undefined}
      subject={doc.header.headline || undefined}
      creator="ELARA"
      producer="ELARA"
    >
      <Page
        size="A4"
        style={{
          paddingTop: theme.metrics.margin,
          paddingBottom: theme.metrics.margin,
          paddingHorizontal: theme.metrics.margin,
          fontFamily: theme.font.pdf,
          fontSize: theme.metrics.base,
          color: INK,
          lineHeight: theme.metrics.lead,
        }}
      >
        <Template doc={doc} theme={theme} />
      </Page>
    </Document>
  );
}

/* ------------------------------------------------------------- primitives */

function styles(theme: ResumeTheme) {
  const m = theme.metrics;

  return StyleSheet.create({
    name: {
      fontSize: m.name,
      fontWeight: "bold",
      letterSpacing: -0.4,
      lineHeight: 1.1,
      color: INK,
    },
    headline: { fontSize: m.headline, lineHeight: 1.3 },
    meta: { fontSize: m.meta, color: FAINT, lineHeight: 1.45 },
    sectionTitle: {
      fontSize: m.sectionTitle,
      fontWeight: "bold",
      letterSpacing: 1,
      color: INK,
      lineHeight: 1.3,
    },
    itemTitle: {
      fontSize: m.itemTitle,
      fontWeight: "bold",
      color: INK,
      lineHeight: 1.25,
    },
    body: { fontSize: m.base, color: MUTED, lineHeight: m.lead },
    row: { flexDirection: "row", justifyContent: "space-between" },
  });
}

/**
 * Contact details on one line.
 *
 * The separator uses single spaces on purpose: react-pdf's line breaker treats
 * a run of several spaces as a break opportunity and emits a hyphen there, so
 * "   ·   " produces stray dashes at the end of wrapped lines.
 */
function ContactLine({
  items,
  theme,
  align = "left",
}: {
  items: string[];
  theme: ResumeTheme;
  align?: "left" | "center";
}) {
  if (items.length === 0) return null;
  const s = styles(theme);

  return (
    <Text style={[s.meta, { textAlign: align }]}>{items.join(" · ")}</Text>
  );
}

function Bullets({
  items,
  theme,
  accent,
  marker,
}: {
  items: string[];
  theme: ResumeTheme;
  accent?: string;
  /** A dash for the compact template; otherwise a drawn dot. */
  marker?: string;
}) {
  if (items.length === 0) return null;
  const s = styles(theme);
  const m = theme.metrics;
  const color = accent ?? FAINT;

  return (
    <View style={{ marginTop: m.lineGap }}>
      {items.map((item, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            marginTop: i === 0 ? 0 : m.lineGap,
          }}
        >
          {marker ? (
            <Text
              style={{
                width: m.base * 0.95,
                fontSize: m.base,
                color,
                lineHeight: m.lead,
              }}
            >
              {marker}
            </Text>
          ) : (
            // Drawn rather than typed: a glyph would depend on the font's
            // encoding, and a rectangle is guaranteed to appear.
            <View style={{ width: m.base * 0.95, paddingTop: m.base * 0.52 }}>
              <View
                style={{
                  width: m.base * 0.22,
                  height: m.base * 0.22,
                  borderRadius: m.base * 0.11,
                  backgroundColor: color,
                }}
              />
            </View>
          )}
          <Text style={[s.body, { flex: 1 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Section body rendering, shared by all four PDF templates — the mirror of the
 * on-screen SectionContent, so a template switch cannot change what the file
 * says.
 *
 * `wrap={false}` on each entry stops a single role being split across a page
 * break, which is the usual way an exported resume ends up looking broken.
 */
function SectionBody({
  section,
  theme,
  accent,
  inlineSkills = false,
  hideLocations = false,
  marker,
}: {
  section: ResumeSectionData;
  theme: ResumeTheme;
  accent: string;
  inlineSkills?: boolean;
  hideLocations?: boolean;
  marker?: string;
}) {
  const s = styles(theme);
  const m = theme.metrics;

  const spaced = (index: number) => ({
    marginTop: index === 0 ? 0 : m.itemGap,
  });

  switch (section.kind) {
    case "SUMMARY":
      return <Text style={s.body}>{section.body}</Text>;

    case "EXPERIENCE":
      return (
        <>
          {section.items.map((item, index) => (
            <View key={item.id} wrap={false} style={spaced(index)}>
              <View style={s.row}>
                <Text style={[s.itemTitle, { flex: 1, paddingRight: m.base }]}>
                  {item.role}
                  <Text style={{ fontWeight: "normal", color: MUTED }}>
                    {"  -  "}
                    {item.company}
                  </Text>
                </Text>
                {item.period ? <Text style={s.meta}>{item.period}</Text> : null}
              </View>

              {item.location && !hideLocations ? (
                <Text style={s.meta}>{item.location}</Text>
              ) : null}

              {item.summary ? (
                <Text style={[s.body, { marginTop: m.lineGap }]}>
                  {item.summary}
                </Text>
              ) : null}

              <Bullets
                items={item.highlights}
                theme={theme}
                accent={accent}
                marker={marker}
              />
            </View>
          ))}
        </>
      );

    case "EDUCATION":
      return (
        <>
          {section.items.map((item, index) => (
            <View key={item.id} wrap={false} style={spaced(index)}>
              <View style={s.row}>
                <Text style={[s.itemTitle, { flex: 1, paddingRight: m.base }]}>
                  {item.school}
                </Text>
                {item.period ? <Text style={s.meta}>{item.period}</Text> : null}
              </View>
              {item.qualification ? (
                <Text style={s.body}>{item.qualification}</Text>
              ) : null}
              {item.detail ? <Text style={s.body}>{item.detail}</Text> : null}
            </View>
          ))}
        </>
      );

    case "PROJECTS":
      return (
        <>
          {section.items.map((item, index) => (
            <View key={item.id} wrap={false} style={spaced(index)}>
              <View style={s.row}>
                <Text style={[s.itemTitle, { flex: 1, paddingRight: m.base }]}>
                  {item.name}
                  {item.role ? (
                    <Text style={{ fontWeight: "normal", color: MUTED }}>
                      {"  -  "}
                      {item.role}
                    </Text>
                  ) : null}
                </Text>
                {item.period ? <Text style={s.meta}>{item.period}</Text> : null}
              </View>

              {item.description ? (
                <Text style={[s.body, { marginTop: m.lineGap }]}>
                  {item.description}
                </Text>
              ) : null}

              <Bullets
                items={item.highlights}
                theme={theme}
                accent={accent}
                marker={marker}
              />

              {item.technologies.length > 0 ? (
                <Text style={[s.meta, { marginTop: m.lineGap }]}>
                  {item.technologies.join(" · ")}
                </Text>
              ) : null}

              {item.url ? (
                <Link
                  src={item.url}
                  style={[s.meta, { color: accent, textDecoration: "none" }]}
                >
                  {displayUrl(item.url)}
                </Link>
              ) : null}
            </View>
          ))}
        </>
      );

    case "SKILLS": {
      if (inlineSkills) {
        const all = section.groups.flatMap((group) => group.items);
        return <Text style={s.body}>{all.join(" · ")}</Text>;
      }

      return (
        <>
          {section.groups.map((group, index) => (
            <View
              key={group.label ?? index}
              style={[{ flexDirection: "row" }, spaced(index)]}
            >
              {group.label ? (
                <Text
                  style={[
                    s.body,
                    { width: m.base * 7, fontWeight: "bold", color: INK },
                  ]}
                >
                  {group.label}
                </Text>
              ) : null}
              <Text style={[s.body, { flex: 1 }]}>
                {group.items.join(", ")}
              </Text>
            </View>
          ))}
        </>
      );
    }

    case "CERTIFICATIONS":
    case "LANGUAGES":
    case "ACHIEVEMENTS":
      return (
        <>
          {section.items.map((item, index) => (
            <View key={item.id} wrap={false} style={spaced(index)}>
              <View style={s.row}>
                <Text style={[s.itemTitle, { flex: 1, paddingRight: m.base }]}>
                  {item.primary}
                </Text>
                {item.meta ? <Text style={s.meta}>{item.meta}</Text> : null}
              </View>
              {item.secondary ? (
                <Text style={s.body}>{item.secondary}</Text>
              ) : null}
            </View>
          ))}
        </>
      );

    case "LINKS":
      return (
        <>
          {section.items.map((item, index) => (
            <View
              key={item.url}
              style={[{ flexDirection: "row" }, spaced(index)]}
            >
              <Text
                style={[
                  s.body,
                  { fontWeight: "bold", color: INK, marginRight: m.base * 0.6 },
                ]}
              >
                {item.label}
              </Text>
              <Link
                src={item.url}
                style={[s.body, { color: accent, textDecoration: "none" }]}
              >
                {displayUrl(item.url)}
              </Link>
            </View>
          ))}
        </>
      );

    default:
      return null;
  }
}

function visibleSections(doc: ResumeDocument) {
  return doc.sections.filter((section) => !isSectionEmpty(section));
}

/* -------------------------------------------------------------- editorial */

function EditorialPdf({
  doc,
  theme,
}: {
  doc: ResumeDocument;
  theme: ResumeTheme;
}) {
  const s = styles(theme);
  const m = theme.metrics;
  const sections = visibleSections(doc);

  return (
    <View>
      <View
        style={{
          paddingBottom: m.base * 0.8,
          borderBottomWidth: 1.5,
          borderBottomColor: theme.accent,
        }}
      >
        <Text style={s.name}>{doc.header.name}</Text>
        {doc.header.headline ? (
          <Text style={[s.headline, { color: theme.accent, marginTop: 3 }]}>
            {doc.header.headline}
          </Text>
        ) : null}
      </View>

      <View style={{ paddingTop: m.base * 0.5 }}>
        <ContactLine items={contactLine(doc.header)} theme={theme} />
        {doc.header.links.length > 0 ? (
          <ContactLine
            theme={theme}
            items={doc.header.links.map(
              (link) => `${link.label}: ${displayUrl(link.url)}`,
            )}
          />
        ) : null}
      </View>

      {sections.map((section, index) => (
        <View
          key={section.kind}
          style={{ flexDirection: "row", marginTop: m.sectionGap }}
        >
          <View style={{ width: m.base * 8.5, paddingRight: m.base }}>
            <Text style={[s.meta, { letterSpacing: 1 }]}>
              {String(index + 1).padStart(2, "0")}
            </Text>
            <Text style={s.sectionTitle}>{section.title.toUpperCase()}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <SectionBody
              section={section}
              theme={theme}
              accent={theme.accent}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

/* ---------------------------------------------------------------- minimal */

function MinimalPdf({
  doc,
  theme,
}: {
  doc: ResumeDocument;
  theme: ResumeTheme;
}) {
  const s = styles(theme);
  const m = theme.metrics;
  const sections = visibleSections(doc);

  const contacts = [
    ...contactLine(doc.header),
    ...doc.header.links.map((link) => displayUrl(link.url)),
  ];

  return (
    <View>
      <View style={{ alignItems: "center", paddingBottom: m.sectionGap }}>
        <Text style={[s.name, { fontWeight: "normal", letterSpacing: 0.6 }]}>
          {doc.header.name}
        </Text>
        {doc.header.headline ? (
          <Text style={[s.headline, { color: MUTED, marginTop: 4 }]}>
            {doc.header.headline}
          </Text>
        ) : null}
        <View style={{ marginTop: 4 }}>
          <ContactLine items={contacts} theme={theme} align="center" />
        </View>
      </View>

      <View style={{ borderTopWidth: 0.75, borderTopColor: HAIRLINE }} />

      {sections.map((section) => (
        <View key={section.kind} style={{ marginTop: m.sectionGap }}>
          <Text
            style={[
              s.sectionTitle,
              {
                fontWeight: "normal",
                letterSpacing: 1.8,
                marginBottom: m.base * 0.6,
              },
            ]}
          >
            {section.title.toUpperCase()}
          </Text>
          <SectionBody section={section} theme={theme} accent={FAINT} />
        </View>
      ))}
    </View>
  );
}

/* ----------------------------------------------------------------- modern */

const SIDEBAR_KINDS = [
  "SKILLS",
  "EDUCATION",
  "LANGUAGES",
  "CERTIFICATIONS",
  "LINKS",
];

function ModernPdf({
  doc,
  theme,
}: {
  doc: ResumeDocument;
  theme: ResumeTheme;
}) {
  const s = styles(theme);
  const m = theme.metrics;
  const sections = visibleSections(doc);

  const main = sections.filter(
    (section) => !SIDEBAR_KINDS.includes(section.kind),
  );
  const aside = sections.filter((section) =>
    SIDEBAR_KINDS.includes(section.kind),
  );

  const heading = (title: string) => (
    <Text
      style={[
        s.sectionTitle,
        {
          paddingBottom: 2,
          marginBottom: m.base * 0.5,
          borderBottomWidth: 1,
          borderBottomColor: theme.accent,
        },
      ]}
    >
      {title.toUpperCase()}
    </Text>
  );

  return (
    <View>
      <View style={{ paddingBottom: m.sectionGap }}>
        <Text style={[s.name, { color: theme.accent }]}>{doc.header.name}</Text>
        {doc.header.headline ? (
          <Text style={[s.headline, { marginTop: 3 }]}>
            {doc.header.headline}
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: "row" }}>
        {/* Sidebar sits first in the flow so the columns align at the top of
            the page; the main column keeps the width. */}
        <View style={{ width: "33%", paddingRight: m.base * 1.6 }}>
          <View>
            {heading("Contact")}
            {contactLine(doc.header).map((item) => (
              <Text key={item} style={s.meta}>
                {item}
              </Text>
            ))}
            {doc.header.links.map((link) => (
              <Link
                key={link.url}
                src={link.url}
                style={[
                  s.meta,
                  { color: theme.accent, textDecoration: "none" },
                ]}
              >
                {displayUrl(link.url)}
              </Link>
            ))}
          </View>

          {aside.map((section) => (
            <View key={section.kind} style={{ marginTop: m.sectionGap }}>
              {heading(section.title)}
              <SectionBody
                section={section}
                theme={theme}
                accent={theme.accent}
                inlineSkills
                hideLocations
              />
            </View>
          ))}
        </View>

        <View style={{ flex: 1 }}>
          {main.map((section, index) => (
            <View
              key={section.kind}
              style={{ marginTop: index === 0 ? 0 : m.sectionGap }}
            >
              {heading(section.title)}
              <SectionBody
                section={section}
                theme={theme}
                accent={theme.accent}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------- compact */

function CompactPdf({
  doc,
  theme,
}: {
  doc: ResumeDocument;
  theme: ResumeTheme;
}) {
  const s = styles(theme);
  const m = theme.metrics;
  const sections = visibleSections(doc);

  const contacts = [
    ...contactLine(doc.header),
    ...doc.header.links.map((link) => displayUrl(link.url)),
  ];

  return (
    <View>
      <View style={[s.row, { alignItems: "flex-end" }]}>
        <Text style={[s.name, { flex: 1 }]}>{doc.header.name}</Text>
        {doc.header.headline ? (
          <Text style={[s.headline, { color: theme.accent }]}>
            {doc.header.headline}
          </Text>
        ) : null}
      </View>

      <View style={{ paddingTop: 3 }}>
        <Text style={s.meta}>{contacts.join(" | ")}</Text>
      </View>

      {sections.map((section) => (
        <View key={section.kind} style={{ marginTop: m.sectionGap }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: m.base * 0.45,
            }}
          >
            <Text style={[s.sectionTitle, { letterSpacing: 1.3 }]}>
              {section.title.toUpperCase()}
            </Text>
            <View
              style={{
                flex: 1,
                height: 0.75,
                marginLeft: m.base * 0.6,
                backgroundColor: theme.accent,
                opacity: 0.4,
              }}
            />
          </View>

          <SectionBody
            section={section}
            theme={theme}
            accent={theme.accent}
            marker="–"
            inlineSkills
            hideLocations
          />
        </View>
      ))}
    </View>
  );
}
