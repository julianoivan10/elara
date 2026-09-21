/**
 * Checks applied to model output before any of it is shown.
 *
 * Pure functions with no provider or server dependency, so they are unit
 * tested directly (ai-guards.test.ts). The assistant's promise not to invent
 * record rests on these as much as on the prompt.
 */

/**
 * Model output is text that is *meant* to be JSON. Tolerate the usual wrapping
 * (code fences, a stray sentence) by taking the outermost object, and report a
 * parse failure as a value rather than throwing a SyntaxError.
 */
export function parseJsonObject(
  text: string,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    return { ok: false, reason: "The model did not return a JSON object." };
  }
  try {
    return { ok: true, value: JSON.parse(text.slice(start, end + 1)) };
  } catch {
    return { ok: false, reason: "The model returned malformed JSON." };
  }
}

/**
 * The backstop for rule 2.
 *
 * Numbers are the fabrication that does real damage on a resume, and they are
 * the one class of invention that is cheap to detect: any figure in the output
 * that was not in the input is rejected. Prompts are guidance; this is a check.
 */
export function containsInventedNumbers(output: string, input: string) {
  const figures = (text: string) =>
    new Set(
      (text.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[,.]$/, "")),
    );

  const source = figures(input);
  for (const figure of figures(output)) {
    if (!source.has(figure)) return true;
  }
  return false;
}

/**
 * Case-, quote- and whitespace-insensitive "does this text appear in that one".
 * A quote the model shortened with an ellipsis matches when every piece of it
 * appears.
 */
export function appearsIn(needle: string, haystack: string) {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[“”"'‘’`]/g, "")
      .replace(/\s+/g, " ")
      .replace(/^[\s.,;:!?-]+|[\s.,;:!?-]+$/g, "");
  const source = norm(haystack);
  const pieces = needle
    .split(/…|\.\.\./)
    .map(norm)
    .filter(Boolean);
  return pieces.length > 0 && pieces.every((piece) => source.includes(piece));
}

export function dedupe(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
