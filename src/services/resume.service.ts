import "server-only";
import type { Prisma, ResumeSectionKind } from "@prisma/client";

import { db } from "@/server/db";
import { AuthorizationError, NotFoundError } from "@/server/auth/guards";
import { CareerService } from "@/services/career.service";
import type { ResumeDocument } from "@/features/resume/document";
import {
  projectDocument,
  toProjectionProfile,
  type SectionConfig,
} from "@/features/resume/project-document";

// The projection itself lives in a pure module so the editor can run it in the
// browser for a live preview. Re-exported here because the service is where the
// rest of the server reaches for resume behaviour.
export {
  parseConfig,
  type SectionConfig,
} from "@/features/resume/project-document";

/* ------------------------------------------------------- default sections */

const DEFAULT_SECTIONS: {
  kind: ResumeSectionKind;
  title: string;
  visible: boolean;
}[] = [
  { kind: "HEADER", title: "Header", visible: true },
  { kind: "SUMMARY", title: "Summary", visible: true },
  { kind: "EXPERIENCE", title: "Experience", visible: true },
  { kind: "PROJECTS", title: "Projects", visible: true },
  { kind: "EDUCATION", title: "Education", visible: true },
  { kind: "SKILLS", title: "Skills", visible: true },
  { kind: "CERTIFICATIONS", title: "Certifications", visible: false },
  { kind: "LANGUAGES", title: "Languages", visible: false },
  { kind: "ACHIEVEMENTS", title: "Achievements", visible: false },
  { kind: "LINKS", title: "Links", visible: false },
];

/* -------------------------------------------------------------- service */

export const ResumeService = {
  async list(userId: string) {
    return db.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        templateKey: true,
        accentKey: true,
        density: true,
        updatedAt: true,
        createdAt: true,
        targetJob: { select: { id: true, title: true, company: true } },
      },
    });
  },

  /**
   * The resume gallery: every resume plus its rendered document, built from one
   * profile read rather than one per card.
   */
  async listForGallery(userId: string) {
    const [resumes, profile] = await Promise.all([
      db.resume.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        include: {
          sections: { orderBy: { sortIndex: "asc" } },
          targetJob: { select: { id: true, title: true, company: true } },
        },
      }),
      CareerService.getProfile(userId),
    ]);

    const projection = profile ? toProjectionProfile(profile) : null;

    return resumes.map((resume) => ({
      id: resume.id,
      title: resume.title,
      templateKey: resume.templateKey,
      accentKey: resume.accentKey,
      fontKey: resume.fontKey,
      density: resume.density,
      updatedAt: resume.updatedAt,
      targetJob: resume.targetJob,
      doc: projectDocument(resume.sections, projection),
    }));
  },

  /**
   * Fetch a resume, proving ownership in the same query. Every read and write
   * in this service is scoped by userId — an id alone is never enough.
   */
  async get(userId: string, resumeId: string) {
    const resume = await db.resume.findUnique({
      where: { id: resumeId },
      include: {
        sections: { orderBy: { sortIndex: "asc" } },
        targetJob: {
          select: {
            id: true,
            title: true,
            company: true,
            skills: true,
            requirements: true,
          },
        },
      },
    });

    if (!resume) throw new NotFoundError("That resume no longer exists.");
    if (resume.userId !== userId) throw new AuthorizationError();
    return resume;
  },

  async create(
    userId: string,
    input: { title: string; templateKey?: string; targetJobId?: string | null },
  ) {
    return db.resume.create({
      data: {
        userId,
        title: input.title,
        templateKey: input.templateKey ?? "editorial",
        targetJobId: input.targetJobId ?? null,
        sections: {
          create: DEFAULT_SECTIONS.map((section, index) => ({
            kind: section.kind,
            title: section.title,
            visible: section.visible,
            sortIndex: index,
          })),
        },
      },
      select: { id: true },
    });
  },

  async duplicate(userId: string, resumeId: string) {
    const source = await ResumeService.get(userId, resumeId);

    return db.resume.create({
      data: {
        userId,
        title: `${source.title} (copy)`,
        templateKey: source.templateKey,
        accentKey: source.accentKey,
        fontKey: source.fontKey,
        density: source.density,
        targetJobId: source.targetJobId,
        sections: {
          create: source.sections.map((section) => ({
            kind: section.kind,
            title: section.title,
            visible: section.visible,
            sortIndex: section.sortIndex,
            config: section.config ?? {},
          })),
        },
      },
      select: { id: true },
    });
  },

  async remove(userId: string, resumeId: string) {
    // deleteMany with the userId in the filter means a mismatched owner deletes
    // nothing, rather than needing a separate read first.
    const result = await db.resume.deleteMany({
      where: { id: resumeId, userId },
    });
    if (result.count === 0) throw new AuthorizationError();
  },

  async updateMeta(
    userId: string,
    resumeId: string,
    patch: {
      title?: string;
      templateKey?: string;
      accentKey?: string;
      fontKey?: string;
      density?: string;
      targetJobId?: string | null;
    },
  ) {
    const result = await db.resume.updateMany({
      where: { id: resumeId, userId },
      data: patch,
    });
    if (result.count === 0) throw new AuthorizationError();
  },

  async updateSection(
    userId: string,
    sectionId: string,
    patch: { title?: string; visible?: boolean; config?: SectionConfig },
  ) {
    const section = await db.resumeSection.findUnique({
      where: { id: sectionId },
      select: { id: true, resume: { select: { userId: true, id: true } } },
    });

    if (!section) throw new NotFoundError();
    if (section.resume.userId !== userId) throw new AuthorizationError();

    await db.$transaction([
      db.resumeSection.update({
        where: { id: sectionId },
        data: {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.visible !== undefined ? { visible: patch.visible } : {}),
          ...(patch.config !== undefined
            ? { config: patch.config as unknown as Prisma.InputJsonValue }
            : {}),
        },
      }),
      // Touch the resume so "last edited" reflects section edits too.
      db.resume.update({
        where: { id: section.resume.id },
        data: { updatedAt: new Date() },
      }),
    ]);
  },

  async reorderSections(
    userId: string,
    resumeId: string,
    orderedIds: string[],
  ) {
    const resume = await ResumeService.get(userId, resumeId);
    const owned = new Set(resume.sections.map((section) => section.id));

    // Ignore anything that is not part of this resume rather than trusting the
    // list the client sent.
    const valid = orderedIds.filter((id) => owned.has(id));

    await db.$transaction([
      ...valid.map((id, index) =>
        db.resumeSection.update({
          where: { id },
          data: { sortIndex: index },
        }),
      ),
      db.resume.update({
        where: { id: resumeId },
        data: { updatedAt: new Date() },
      }),
    ]);
  },

  /**
   * Project the profile through a resume's sections into a ResumeDocument.
   *
   * This is the only place the two models meet. Templates and the PDF renderer
   * both consume the result, so they cannot disagree about what is on the page.
   */
  async buildDocument(
    userId: string,
    resumeId: string,
  ): Promise<ResumeDocument> {
    const [resume, profile] = await Promise.all([
      ResumeService.get(userId, resumeId),
      CareerService.getProfile(userId),
    ]);

    return projectDocument(
      resume.sections,
      profile ? toProjectionProfile(profile) : null,
    );
  },
};
