"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import { logError } from "@/server/log";
import { requireProfile, requireUser } from "@/server/auth/guards";
import { CareerService, type FullProfile } from "@/services/career.service";
import {
  AiService,
  AiUserError,
  type ProfileContext,
  type ProfileReview,
  type Suggestions,
  type TailorResult,
} from "@/services/ai.service";
import { fail, ok, type ActionState } from "@/server/actions/result";
import { unexpected } from "@/server/actions/unexpected";

/**
 * AI actions.
 *
 * Every one of these reads the user's own profile server-side and sends only
 * that. Nothing the client posts is trusted as context, so a crafted request
 * cannot make the assistant write about someone else's record.
 */

export type AiResult<T> =
  { status: "ok"; data: T } | { status: "error"; message: string };

function toError(error: unknown, context: string): AiResult<never> {
  // Written for the person (not configured, rate limited, busy): show as-is.
  if (error instanceof AiUserError) {
    return { status: "error", message: error.message };
  }
  // Provider failures, malformed output, database errors: log the cause and
  // show something neutral. Nothing provider-specific reaches the browser.
  logError(context, error);
  return {
    status: "error",
    message: "The assistant could not answer that. Try again in a moment.",
  };
}

const id = z.string().trim().min(1).max(64);

/** The whole profile, reduced to what the assistant may read. */
function toContext(profile: FullProfile | null): ProfileContext {
  return {
    headline: profile?.headline ?? null,
    summary: profile?.summary ?? null,
    roles: (profile?.experience ?? []).slice(0, 8).map((role) => ({
      role: role.role,
      company: role.company,
      summary: role.summary,
      highlights: role.highlights,
    })),
    projects: (profile?.projects ?? []).slice(0, 8).map((project) => ({
      name: project.name,
      description: project.description,
      highlights: project.highlights,
      technologies: project.technologies,
    })),
    education: (profile?.education ?? []).map((entry) => ({
      school: entry.school,
      degree: entry.degree,
      field: entry.field,
    })),
    skills: (profile?.skills ?? []).map((skill) => skill.name),
    certifications: (profile?.certifications ?? []).map((c) => c.name),
    achievements: (profile?.achievements ?? []).map((a) => a.title),
  };
}

/** Enough written down for the assistant to work from without padding. */
function hasSubstance(context: ProfileContext) {
  return (
    context.roles.length > 0 ||
    context.projects.length > 0 ||
    (context.summary?.trim().length ?? 0) >= 40
  );
}

const THIN_PROFILE =
  "There is not much to work with yet. Add a role, a project or a short summary first, and the assistant will work from that.";

/* ---------------------------------------------------------------- summary */

export async function improveSummaryAction(
  draft: string,
): Promise<AiResult<Suggestions>> {
  const user = await requireUser();

  const parsedDraft = z
    .string()
    .max(4000)
    .safeParse(draft ?? "");
  if (!parsedDraft.success) {
    return { status: "error", message: "That summary is too long to work on." };
  }

  try {
    const profile = await CareerService.getProfile(user.id);
    const current = parsedDraft.data.trim() || profile?.summary?.trim() || "";

    if (current.length < 40 && (profile?.experience.length ?? 0) === 0) {
      return {
        status: "error",
        message:
          "There is not much to work with yet. Add a role or a few sentences first, and the assistant will sharpen them.",
      };
    }

    const data = await AiService.improveSummary(user.id, {
      current,
      headline: profile?.headline ?? null,
      roles: (profile?.experience ?? []).slice(0, 4).map((role) => ({
        role: role.role,
        company: role.company,
        highlights: role.highlights,
      })),
      skills: (profile?.skills ?? []).map((skill) => skill.name),
    });

    return { status: "ok", data };
  } catch (error) {
    return toError(error, "improveSummaryAction");
  }
}

/** Write an accepted summary to the profile. */
export async function applySummaryAction(text: string): Promise<ActionState> {
  const { profileId } = await requireProfile();

  const parsed = z.string().trim().min(1).max(1200).safeParse(text);
  if (!parsed.success) return fail("That summary is empty or too long.");

  try {
    await db.profile.update({
      where: { id: profileId },
      data: { summary: parsed.data },
    });
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    return ok("Summary updated.");
  } catch (error) {
    return unexpected(error, "applySummaryAction");
  }
}

/* -------------------------------------------------------------- highlight */

const highlightRef = z.object({
  experienceId: id,
  index: z.number().int().min(0).max(100),
});

export async function improveHighlightAction(input: {
  experienceId: string;
  index: number;
}): Promise<AiResult<Suggestions>> {
  const { user, profileId } = await requireProfile();

  const ref = highlightRef.safeParse(input);
  if (!ref.success) {
    return { status: "error", message: "That line no longer exists." };
  }

  try {
    // The bullet is read from the database by id rather than taken from the
    // request, so the assistant only ever sees the user's own text.
    const role = await db.experience.findFirst({
      where: { id: ref.data.experienceId, profileId },
      select: { role: true, company: true, highlights: true },
    });

    if (!role)
      return { status: "error", message: "That entry no longer exists." };

    const bullet = role.highlights[ref.data.index];
    if (!bullet) {
      return { status: "error", message: "That line no longer exists." };
    }

    const data = await AiService.improveHighlight(user.id, {
      bullet,
      role: role.role,
      company: role.company,
    });

    return { status: "ok", data };
  } catch (error) {
    return toError(error, "improveHighlightAction");
  }
}

export async function applyHighlightAction(input: {
  experienceId: string;
  index: number;
  text: string;
}): Promise<ActionState> {
  const { profileId } = await requireProfile();

  const ref = highlightRef.safeParse(input);
  if (!ref.success) return fail("That line no longer exists.");

  const parsed = z.string().trim().min(1).max(400).safeParse(input.text);
  if (!parsed.success) return fail("That line is empty or too long.");

  try {
    const role = await db.experience.findFirst({
      where: { id: ref.data.experienceId, profileId },
      select: { highlights: true },
    });
    if (!role) return fail("That entry no longer exists.");

    const highlights = [...role.highlights];
    if (!highlights[ref.data.index]) return fail("That line no longer exists.");
    highlights[ref.data.index] = parsed.data;

    await db.experience.updateMany({
      where: { id: ref.data.experienceId, profileId },
      data: { highlights },
    });

    revalidatePath("/profile");
    revalidatePath("/resume", "layout");
    return ok("Line updated.");
  } catch (error) {
    return unexpected(error, "applyHighlightAction");
  }
}

/* ---------------------------------------------------------------- project */

export async function describeProjectAction(
  projectId: string,
): Promise<AiResult<Suggestions>> {
  const { user, profileId } = await requireProfile();

  const parsedId = id.safeParse(projectId);
  if (!parsedId.success) {
    return { status: "error", message: "That project no longer exists." };
  }

  try {
    const project = await db.project.findFirst({
      where: { id: parsedId.data, profileId },
      select: {
        name: true,
        role: true,
        description: true,
        highlights: true,
        technologies: true,
      },
    });

    if (!project) {
      return { status: "error", message: "That project no longer exists." };
    }

    const written = [project.description ?? "", ...project.highlights]
      .join(" ")
      .trim();
    if (written.length < 20 && project.technologies.length === 0) {
      return {
        status: "error",
        message:
          "Add a line about what the project is or what you did on it, and the assistant will tighten it into a description.",
      };
    }

    const data = await AiService.describeProject(user.id, project);
    return { status: "ok", data };
  } catch (error) {
    return toError(error, "describeProjectAction");
  }
}

export async function applyProjectDescriptionAction(input: {
  projectId: string;
  text: string;
}): Promise<ActionState> {
  const { profileId } = await requireProfile();

  const parsedId = id.safeParse(input.projectId);
  if (!parsedId.success) return fail("That project no longer exists.");

  const parsed = z.string().trim().min(1).max(600).safeParse(input.text);
  if (!parsed.success) return fail("That description is empty or too long.");

  try {
    const { count } = await db.project.updateMany({
      where: { id: parsedId.data, profileId },
      data: { description: parsed.data },
    });
    if (count === 0) return fail("That project no longer exists.");

    revalidatePath("/profile");
    revalidatePath("/projects");
    revalidatePath("/resume", "layout");
    return ok("Description updated.");
  } catch (error) {
    return unexpected(error, "applyProjectDescriptionAction");
  }
}

/* ----------------------------------------------------------------- skills */

export async function suggestSkillsAction(): Promise<
  AiResult<{
    suggestions: { name: string; evidence: string }[];
    notes: string[];
  }>
> {
  const user = await requireUser();

  try {
    const profile = await CareerService.getProfile(user.id);

    const evidence = [
      ...(profile?.experience ?? []).flatMap((role) => [
        `${role.role} at ${role.company}: ${role.summary ?? ""}`,
        ...role.highlights,
      ]),
      ...(profile?.projects ?? []).flatMap((project) => [
        `${project.name}: ${project.description ?? ""}`,
        ...project.highlights,
      ]),
    ].filter((line) => line.trim().length > 12);

    if (evidence.length === 0) {
      return {
        status: "error",
        message:
          "Add a role or a project with a line or two about what you did, and the assistant can pull skills out of it.",
      };
    }

    const data = await AiService.suggestSkills(user.id, {
      existing: (profile?.skills ?? []).map((skill) => skill.name),
      evidence,
    });

    return { status: "ok", data };
  } catch (error) {
    return toError(error, "suggestSkillsAction");
  }
}

/* -------------------------------------------------------------------- job */

export async function analyzeJobAction(jobId: string) {
  const user = await requireUser();

  const parsedId = id.safeParse(jobId);
  if (!parsedId.success) {
    return {
      status: "error" as const,
      message: "That job is no longer listed.",
    };
  }

  try {
    const [job, profile] = await Promise.all([
      db.job.findUnique({
        where: { id: parsedId.data },
        select: {
          title: true,
          company: true,
          description: true,
          requirements: true,
          skills: true,
        },
      }),
      CareerService.getProfile(user.id),
    ]);

    if (!job) {
      return {
        status: "error" as const,
        message: "That job is no longer listed.",
      };
    }

    const data = await AiService.analyzeJob(user.id, {
      ...job,
      profileSkills: (profile?.skills ?? []).map((skill) => skill.name),
      profileHighlights: (profile?.experience ?? [])
        .flatMap((role) => role.highlights)
        .slice(0, 12),
    });

    return { status: "ok" as const, data };
  } catch (error) {
    return toError(error, "analyzeJobAction");
  }
}

/* ----------------------------------------------------------------- tailor */

/**
 * Tailor a resume to the posting it targets: a role-angled summary, which of
 * the person's own lines to lead with, and the posting's keywords split into
 * evidenced and missing. The resume is looked up by owner, and the job is the
 * one already attached to it — the client names neither.
 */
export async function tailorResumeAction(
  resumeId: string,
): Promise<AiResult<TailorResult>> {
  const user = await requireUser();

  const parsedId = id.safeParse(resumeId);
  if (!parsedId.success) {
    return { status: "error", message: "That resume no longer exists." };
  }

  try {
    const [resume, profile] = await Promise.all([
      db.resume.findFirst({
        where: { id: parsedId.data, userId: user.id },
        select: {
          targetJob: {
            select: {
              title: true,
              company: true,
              description: true,
              requirements: true,
              skills: true,
            },
          },
        },
      }),
      CareerService.getProfile(user.id),
    ]);

    if (!resume) {
      return { status: "error", message: "That resume no longer exists." };
    }
    if (!resume.targetJob) {
      return {
        status: "error",
        message:
          "This resume is not aimed at a job. Create one from a job posting to tailor it.",
      };
    }

    const context = toContext(profile);
    if (!hasSubstance(context)) {
      return { status: "error", message: THIN_PROFILE };
    }

    const data = await AiService.tailorResume(user.id, {
      job: resume.targetJob,
      profile: context,
    });
    return { status: "ok", data };
  } catch (error) {
    return toError(error, "tailorResumeAction");
  }
}

/* ----------------------------------------------------------------- review */

export async function reviewProfileAction(): Promise<AiResult<ProfileReview>> {
  const user = await requireUser();

  try {
    const context = toContext(await CareerService.getProfile(user.id));
    if (!hasSubstance(context)) {
      return { status: "error", message: THIN_PROFILE };
    }

    const data = await AiService.reviewProfile(user.id, context);
    return { status: "ok", data };
  } catch (error) {
    return toError(error, "reviewProfileAction");
  }
}

/** Whether the assistant is switched on, for UI that should not offer it. */
export async function aiAvailableAction() {
  await requireUser();
  return AiService.configured;
}
