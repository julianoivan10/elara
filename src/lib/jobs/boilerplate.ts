import { contentHash } from "@/lib/jobs/normalize";
import { textToBlocks, type TextBlock } from "@/lib/jobs/html-text";
import { extractSkills } from "@/lib/jobs/skills";
import type { NormalizedJob } from "@/lib/jobs/types";

/**
 * Company boilerplate — the "About us" paragraph, the benefits footer, the
 * equal-opportunity statement — repeats across a company's postings. Left in,
 * it gives every job the same summary and the same "skills" (an investor
 * named "Salesforce Ventures" is not a Salesforce requirement).
 *
 * Within one source's batch, any block that appears in a large share of the
 * postings is treated as boilerplate: it stays in the description, but skills
 * and the summary are taken from the rest.
 */

const blockKey = (block: TextBlock) =>
  (block.type === "list" ? block.items.join("\n") : block.text)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export function boilerplateKeys(jobs: NormalizedJob[]): Set<string> {
  if (jobs.length < 4) return new Set();
  const threshold = Math.max(3, Math.ceil(jobs.length * 0.4));
  const counts = new Map<string, number>();
  for (const job of jobs) {
    // Count each block once per job.
    for (const key of new Set(textToBlocks(job.description).map(blockKey))) {
      if (key.length >= 40) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return new Set(
    [...counts].filter(([, n]) => n >= threshold).map(([key]) => key),
  );
}

function summaryFrom(blocks: TextBlock[]): string {
  const paragraph =
    blocks.find((b) => b.type === "paragraph" && b.text.length >= 60) ??
    blocks.find((b) => b.type === "paragraph");
  const text = paragraph?.type === "paragraph" ? paragraph.text : "";
  if (text.length <= 280) return text;
  const cut = text.slice(0, 280);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export function refineWithBoilerplate(jobs: NormalizedJob[]): NormalizedJob[] {
  const boilerplate = boilerplateKeys(jobs);
  if (boilerplate.size === 0) return jobs;

  return jobs.map((job) => {
    const own = textToBlocks(job.description).filter(
      (b) => !boilerplate.has(blockKey(b)),
    );
    if (own.length === 0) return job;

    const ownText = own
      .map((b) => (b.type === "list" ? b.items.join("\n") : b.text))
      .join("\n");
    const refined = {
      ...job,
      skills: extractSkills(`${job.title}\n${ownText}`, [job.company]),
      summary: summaryFrom(own) || job.summary,
    };
    const { contentHash: _old, ...rest } = refined;
    void _old;
    return { ...refined, contentHash: contentHash(rest) };
  });
}
