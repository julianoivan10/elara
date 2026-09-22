/**
 * Third-party job descriptions arrive as HTML. ELARA never renders that HTML:
 * at ingestion it is reduced to a small, plain structure — headings,
 * paragraphs, bullet lists — stored as text, and rendered as React text
 * nodes. Nothing a provider sends can become markup, script or a tracking
 * pixel on ELARA's pages.
 *
 * Stored format (one block per blank-line-separated chunk):
 *   ## Heading
 *   A paragraph of text.
 *   - a list item
 *   - another item
 */

export type TextBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
  bull: "•",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
  eacute: "é",
  euro: "€",
  pound: "£",
};

export function decodeEntities(text: string): string {
  return text.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, code: string) => {
      if (code[0] === "#") {
        const n =
          code[1] === "x" || code[1] === "X"
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        // Refuse control characters and invalid code points.
        if (!Number.isFinite(n) || n < 32 || n > 0x10ffff) return " ";
        return String.fromCodePoint(n);
      }
      return NAMED_ENTITIES[code.toLowerCase()] ?? match;
    },
  );
}

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "section",
  "article",
  "header",
  "footer",
  "blockquote",
  "table",
  "tr",
  "ul",
  "ol",
  "li",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);
const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);
const BOLD_TAGS = new Set(["strong", "b"]);

const clean = (text: string) =>
  text
    .replace(/[ \s]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();

/** Convert provider HTML into plain blocks. Tolerant of broken markup. */
export function htmlToBlocks(input: string): TextBlock[] {
  let html = input ?? "";
  // Greenhouse sends HTML-escaped HTML ("&lt;p&gt;…"). Unescape once first.
  if (!html.includes("<") && /&lt;\/?[a-z]/i.test(html))
    html = decodeEntities(html);

  html = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|iframe|svg)\b[\s\S]*?<\/\1>/gi, " ");

  const blocks: TextBlock[] = [];
  let text = "";
  let boldText = "";
  let listDepth = 0;
  let inItem = false;
  let heading = false;
  let bold = 0;

  const flush = () => {
    const value = clean(decodeEntities(text));
    const boldValue = clean(decodeEntities(boldText));
    text = "";
    boldText = "";
    if (!value) return;

    if (inItem || listDepth > 0) {
      const last = blocks.at(-1);
      if (last?.type === "list") last.items.push(value);
      else blocks.push({ type: "list", items: [value] });
      return;
    }

    // A short paragraph that is entirely bold reads as a heading.
    const isBoldLine =
      boldValue.length > 0 && boldValue === value && value.length <= 80;
    if (heading || isBoldLine) {
      blocks.push({ type: "heading", text: value.replace(/:$/, "") });
    } else {
      blocks.push({ type: "paragraph", text: value });
    }
  };

  const token = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>|[^<]+|</g;
  for (const match of html.matchAll(token)) {
    const raw = match[0];
    const tag = match[1]?.toLowerCase();

    if (!tag) {
      text += raw;
      if (bold > 0) boldText += raw;
      continue;
    }

    const closing = raw.startsWith("</");
    if (BOLD_TAGS.has(tag)) {
      bold = Math.max(0, bold + (closing ? -1 : 1));
      continue;
    }
    if (!BLOCK_TAGS.has(tag)) continue;

    flush();
    if (tag === "ul" || tag === "ol")
      listDepth = Math.max(0, listDepth + (closing ? -1 : 1));
    else if (tag === "li") inItem = !closing;
    else if (HEADING_TAGS.has(tag)) heading = !closing;
  }
  flush();

  return mergeAdjacentLists(blocks);
}

function mergeAdjacentLists(blocks: TextBlock[]): TextBlock[] {
  const out: TextBlock[] = [];
  for (const block of blocks) {
    const last = out.at(-1);
    if (block.type === "list" && last?.type === "list")
      last.items.push(...block.items);
    else out.push(block);
  }
  return out;
}

/** Plain text (for example Adzuna excerpts or Ashby's descriptionPlain). */
export function plainToBlocks(input: string): TextBlock[] {
  return (input ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((chunk) => clean(chunk))
    .filter(Boolean)
    .map((text) => ({ type: "paragraph" as const, text }));
}

export function blocksToText(blocks: TextBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "heading") return `## ${block.text}`;
      if (block.type === "list")
        return block.items.map((item) => `- ${item}`).join("\n");
      return block.text;
    })
    .join("\n\n");
}

/** Parse the stored text back into blocks, for rendering. */
export function textToBlocks(text: string): TextBlock[] {
  return (text ?? "")
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): TextBlock => {
      if (chunk.startsWith("## "))
        return { type: "heading", text: chunk.slice(3).trim() };
      const lines = chunk.split("\n");
      if (lines.every((line) => line.startsWith("- "))) {
        return {
          type: "list",
          items: lines.map((line) => line.slice(2).trim()),
        };
      }
      return { type: "paragraph", text: chunk.replace(/\n/g, " ") };
    });
}
