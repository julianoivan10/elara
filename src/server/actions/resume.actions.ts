"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import {
  requireUser,
  AuthorizationError,
  NotFoundError,
} from "@/server/auth/guards";
import { ResumeService } from "@/services/resume.service";
import { configSchema } from "@/features/resume/project-document";
import {
  RESUME_ACCENTS,
  RESUME_DENSITIES,
  RESUME_FONTS,
} from "@/features/resume/document";
import { RESUME_TEMPLATES } from "@/features/resume/templates";
import { fail, fromZod, ok, type ActionState } from "@/server/actions/result";
import { unexpected } from "@/server/actions/unexpected";

/**
 * Resume actions.
 *
 * Every write goes through ResumeService, which scopes by userId — these
 * handlers never query a resume by id alone.
 */

function handle(error: unknown, context: string): ActionState {
  if (error instanceof AuthorizationError || error instanceof NotFoundError) {
    return fail(error.message);
  }
  return unexpected(error, context);
}

function refresh(resumeId?: string) {
  revalidatePath("/resume");
  revalidatePath("/dashboard");
  if (resumeId) revalidatePath(`/resume/${resumeId}`);
}

/* ------------------------------------------------------------------ create */

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the resume a name.")
    .max(80, "That name is too long."),
  templateKey: z
    .string()
    .refine((key) => RESUME_TEMPLATES.some((t) => t.key === key), {
      message: "Pick a template.",
    })
    .default("editorial"),
  targetJobId: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export async function createResumeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    templateKey: formData.get("templateKey") ?? undefined,
    targetJobId: formData.get("targetJobId") ?? undefined,
  });
  if (!parsed.success) return fromZod(parsed.error);

  let id: string;
  try {
    // A target job must belong to the catalogue; anything else is ignored
    // rather than written through to the database.
    const targetJobId = parsed.data.targetJobId
      ? ((
          await db.job.findUnique({
            where: { id: parsed.data.targetJobId },
            select: { id: true },
          })
        )?.id ?? null)
      : null;

    const resume = await ResumeService.create(user.id, {
      title: parsed.data.title,
      templateKey: parsed.data.templateKey,
      targetJobId,
    });
    id = resume.id;
  } catch (error) {
    return handle(error, "createResumeAction");
  }

  refresh();
  redirect(`/resume/${id}`);
}

/**
 * "Create a tailored resume" from a job posting. It copies nothing from the
 * job into the resume's content — it only records what the resume is aimed at,
 * so the editor can show what the posting asks for beside your own wording.
 */
export async function createTailoredResumeAction(jobId: string) {
  const user = await requireUser();

  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { id: true, title: true, company: true },
  });
  if (!job) return fail("That job is no longer listed.");

  let id: string;
  try {
    const resume = await ResumeService.create(user.id, {
      title: `${job.title} — ${job.company}`,
      targetJobId: job.id,
    });
    id = resume.id;
  } catch (error) {
    return handle(error, "createTailoredResumeAction");
  }

  refresh();
  redirect(`/resume/${id}`);
}

/* ------------------------------------------------------- duplicate, delete */

export async function duplicateResumeAction(resumeId: string) {
  const user = await requireUser();

  let id: string;
  try {
    const copy = await ResumeService.duplicate(user.id, resumeId);
    id = copy.id;
  } catch (error) {
    return handle(error, "duplicateResumeAction");
  }

  refresh();
  redirect(`/resume/${id}`);
}

export async function deleteResumeAction(
  resumeId: string,
): Promise<ActionState> {
  const user = await requireUser();

  try {
    await ResumeService.remove(user.id, resumeId);
    refresh();
    return ok("Resume deleted.");
  } catch (error) {
    return handle(error, "deleteResumeAction");
  }
}

/* -------------------------------------------------------------------- meta */

const metaSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  templateKey: z
    .string()
    .refine((key) => RESUME_TEMPLATES.some((t) => t.key === key))
    .optional(),
  accentKey: z
    .enum(Object.keys(RESUME_ACCENTS) as [string, ...string[]])
    .optional(),
  fontKey: z
    .enum(Object.keys(RESUME_FONTS) as [string, ...string[]])
    .optional(),
  density: z
    .enum(Object.keys(RESUME_DENSITIES) as [string, ...string[]])
    .optional(),
  targetJobId: z.string().nullable().optional(),
});

export async function updateResumeMetaAction(
  resumeId: string,
  patch: unknown,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = metaSchema.safeParse(patch);
  if (!parsed.success) return fromZod(parsed.error);

  try {
    await ResumeService.updateMeta(user.id, resumeId, parsed.data);
    refresh(resumeId);
    return ok("Saved.");
  } catch (error) {
    return handle(error, "updateResumeMetaAction");
  }
}

/* ---------------------------------------------------------------- sections */

const sectionPatchSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  visible: z.boolean().optional(),
  config: configSchema.optional(),
});

export async function updateResumeSectionAction(
  sectionId: string,
  patch: unknown,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = sectionPatchSchema.safeParse(patch);
  if (!parsed.success) return fromZod(parsed.error);

  try {
    await ResumeService.updateSection(user.id, sectionId, parsed.data);
    return ok("Saved.");
  } catch (error) {
    return handle(error, "updateResumeSectionAction");
  }
}

export async function reorderResumeSectionsAction(
  resumeId: string,
  orderedIds: string[],
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = z.array(z.string()).max(20).safeParse(orderedIds);
  if (!parsed.success) return fail("That order is not valid.");

  try {
    await ResumeService.reorderSections(user.id, resumeId, parsed.data);
    return ok("Saved.");
  } catch (error) {
    return handle(error, "reorderResumeSectionsAction");
  }
}
