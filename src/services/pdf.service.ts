import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";

import { resolveTheme } from "@/features/resume/document";
import { ResumeService } from "@/services/resume.service";
import { ResumePdf } from "@/features/resume/pdf/pdf-document";

/**
 * PDF generation.
 *
 * Rendering happens server-side with react-pdf rather than by printing a web
 * page in a headless browser: no Chromium to install or keep alive, and the
 * output is a genuine text document with real A4 geometry and working links.
 */
export const PdfService = {
  /**
   * Build the PDF for a resume the user owns. Ownership is enforced by
   * ResumeService, which scopes every read by userId.
   */
  async renderResume(userId: string, resumeId: string) {
    const resume = await ResumeService.get(userId, resumeId);
    const doc = await ResumeService.buildDocument(userId, resumeId);

    const theme = resolveTheme({
      accentKey: resume.accentKey,
      fontKey: resume.fontKey,
      density: resume.density,
    });

    const buffer = await renderToBuffer(
      ResumePdf({ doc, theme, templateKey: resume.templateKey }),
    );

    return { buffer, filename: filenameFor(doc.header.name, resume.title) };
  },
};

/**
 * "Amara Ilunga — Front-end engineer.pdf": named for the person and the role,
 * because this file lands in a stranger's downloads folder.
 */
function filenameFor(name: string, title: string) {
  const safe = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, " ");

  const parts = [safe(name), safe(title)].filter(Boolean);
  return `${parts.join(" - ") || "resume"}.pdf`;
}
