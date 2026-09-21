import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  requireUser,
  AuthorizationError,
  NotFoundError,
} from "@/server/auth/guards";
import { CareerService } from "@/services/career.service";
import { AiService } from "@/services/ai.service";
import { ResumeService } from "@/services/resume.service";
import {
  parseConfig,
  toProjectionProfile,
} from "@/features/resume/project-document";
import {
  type AccentKey,
  type DensityKey,
  type FontKey,
  RESUME_ACCENTS,
  RESUME_DENSITIES,
  RESUME_FONTS,
} from "@/features/resume/document";
import { ResumeEditor } from "@/features/resume/editor/resume-editor";

export const dynamic = "force-dynamic";
/** Covers the assistant's server actions on this page (see src/server/ai/gemini.ts). */
export const maxDuration = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const user = await requireUser();
    const resume = await ResumeService.get(user.id, id);
    return { title: resume.title };
  } catch {
    return { title: "Resume" };
  }
}

/** Fall back to the default rather than trusting a stored key. */
function key<T extends string>(
  value: string,
  options: Record<string, unknown>,
  fallback: T,
): T {
  return (value in options ? value : fallback) as T;
}

export default async function ResumeEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  let resume;
  try {
    resume = await ResumeService.get(user.id, id);
  } catch (error) {
    // A resume belonging to someone else is reported as missing rather than
    // as forbidden, so ids cannot be probed for existence.
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      notFound();
    }
    throw error;
  }

  const profile = await CareerService.getProfile(user.id);

  return (
    <ResumeEditor
      resumeId={resume.id}
      initialMeta={{
        title: resume.title,
        templateKey: resume.templateKey,
        accentKey: key<AccentKey>(resume.accentKey, RESUME_ACCENTS, "cobalt"),
        fontKey: key<FontKey>(resume.fontKey, RESUME_FONTS, "sans"),
        density: key<DensityKey>(resume.density, RESUME_DENSITIES, "regular"),
      }}
      initialSections={resume.sections.map((section) => ({
        id: section.id,
        kind: section.kind,
        title: section.title,
        visible: section.visible,
        sortIndex: section.sortIndex,
        config: parseConfig(section.config),
      }))}
      profile={profile ? toProjectionProfile(profile) : null}
      targetJob={resume.targetJob}
      aiEnabled={AiService.configured}
    />
  );
}
