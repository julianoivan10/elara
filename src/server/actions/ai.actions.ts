"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/server/db";
import { requireProfile, requireUser } from "@/server/auth/guards";
import { CareerService } from "@/services/career.service";
import {
  AiNotConfiguredError,
  AiRateLimitError,
  AiService,
  type Suggestions,
} from "@/services/ai.service";
import {
  fail,
  ok,
  unexpected,
  type ActionState,
} from "@/server/actions/result";

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
  if (
    error instanceof AiNotConfiguredError ||
    error instanceof AiRateLimitError
  ) {
    return { status: "error", message: error.message };
  }
  console.error(`[${context}]`, error);
  return {
    status: "error",
    message: "The assistant could not answer that. Try again in a moment.",
  };
}

/* ---------------------------------------------------------------- summary */

export async function improveSummaryAction(
  draft: string,
): Promise<AiResult<Suggestions>> {
  const user = await requireUser();

  try {
    const profile = await CareerService.getProfile(user.id);
    const current = (draft ?? "").trim() || profile?.summary?.trim() || "";

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

export async function improveHighlightAction(input: {
  experienceId: string;
  index: number;
}): Promise<AiResult<Suggestions>> {
  const { user, profileId } = await requireProfile();

  try {
    // The bullet is read from the database by id rather than taken from the
    // request, so the assistant only ever sees the user's own text.
    const role = await db.experience.findFirst({
      where: { id: input.experienceId, profileId },
      select: { role: true, company: true, highlights: true },
    });

    if (!role)
      return { status: "error", message: "That entry no longer exists." };

    const bullet = role.highlights[input.index];
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

  const parsed = z.string().trim().min(1).max(400).safeParse(input.text);
  if (!parsed.success) return fail("That line is empty or too long.");

  try {
    const role = await db.experience.findFirst({
      where: { id: input.experienceId, profileId },
      select: { highlights: true },
    });
    if (!role) return fail("That entry no longer exists.");

    const highlights = [...role.highlights];
    if (!highlights[input.index]) return fail("That line no longer exists.");
    highlights[input.index] = parsed.data;

    await db.experience.updateMany({
      where: { id: input.experienceId, profileId },
      data: { highlights },
    });

    revalidatePath("/profile");
    revalidatePath("/resume", "layout");
    return ok("Line updated.");
  } catch (error) {
    return unexpected(error, "applyHighlightAction");
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

  try {
    const [job, profile] = await Promise.all([
      db.job.findUnique({
        where: { id: jobId },
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

/** Whether the assistant is switched on, for UI that should not offer it. */
export async function aiAvailableAction() {
  await requireUser();
  return AiService.configured;
}
