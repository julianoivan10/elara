"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { db } from "@/server/db";
import { requireProfile } from "@/server/auth/guards";
import { CareerService } from "@/services/career.service";
import {
  achievementSchema,
  basicsSchema,
  bulkSkillsSchema,
  certificationSchema,
  educationSchema,
  experienceSchema,
  languageSchema,
  linkSchema,
  projectSchema,
  skillSchema,
} from "@/lib/validation/profile";
import {
  fail,
  fromZod,
  ok,
  unexpected,
  type ActionState,
} from "@/server/actions/result";

/**
 * Profile CRUD.
 *
 * The eight profile sections differ only in their schema and table, so they
 * share one create/update/delete/reorder implementation bound to an entry kind.
 * The alternative — thirty-two near-identical actions — is where authorization
 * checks get forgotten in exactly one of them.
 */

type EntryKind =
  | "link"
  | "experience"
  | "education"
  | "project"
  | "skill"
  | "certification"
  | "language"
  | "achievement";

/* eslint-disable @typescript-eslint/no-explicit-any */
const REGISTRY: Record<
  EntryKind,
  { schema: z.ZodType<any>; model: EntryKind; path: string }
> = {
  link: { schema: linkSchema, model: "link", path: "/profile" },
  experience: {
    schema: experienceSchema,
    model: "experience",
    path: "/profile",
  },
  education: { schema: educationSchema, model: "education", path: "/profile" },
  project: { schema: projectSchema, model: "project", path: "/projects" },
  skill: { schema: skillSchema, model: "skill", path: "/profile" },
  certification: {
    schema: certificationSchema,
    model: "certification",
    path: "/profile",
  },
  language: { schema: languageSchema, model: "language", path: "/profile" },
  achievement: {
    schema: achievementSchema,
    model: "achievement",
    path: "/profile",
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Prisma's per-model delegates are structurally identical for the operations
 * used here. One narrow surface keeps the shared implementation honest without
 * reaching for `any` at every call site.
 */
type Delegate = {
  create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
  updateMany: (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => Promise<{ count: number }>;
  deleteMany: (args: {
    where: Record<string, unknown>;
  }) => Promise<{ count: number }>;
  findMany: (args: {
    where: Record<string, unknown>;
    orderBy: Record<string, unknown>;
    select: Record<string, boolean>;
  }) => Promise<{ id: string; sortIndex: number }[]>;
};

function delegate(model: EntryKind): Delegate {
  return db[model] as unknown as Delegate;
}

function refresh(path: string) {
  revalidatePath(path);
  revalidatePath("/dashboard");
  // A profile change can alter every resume's content.
  revalidatePath("/resume", "layout");
}

/* ------------------------------------------------------------------ basics */

export async function saveBasicsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { profileId } = await requireProfile();

  const parsed = basicsSchema.safeParse({
    fullName: formData.get("fullName"),
    headline: formData.get("headline"),
    summary: formData.get("summary"),
    location: formData.get("location"),
    phone: formData.get("phone"),
    website: formData.get("website"),
    openToWork: formData.get("openToWork") === "on",
  });
  if (!parsed.success) return fromZod(parsed.error);

  try {
    await db.profile.update({ where: { id: profileId }, data: parsed.data });
    refresh("/profile");
    return ok("Saved.");
  } catch (error) {
    return unexpected(error, "saveBasicsAction");
  }
}

/* ------------------------------------------------------------- entry CRUD */

export async function saveEntryAction(
  kind: EntryKind,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { profileId } = await requireProfile();
  const entry = REGISTRY[kind];

  const raw = Object.fromEntries(formData.entries());
  // Unchecked checkboxes are absent from FormData, so booleans are normalised
  // before parsing rather than being left undefined.
  const parsed = entry.schema.safeParse({
    ...raw,
    current: formData.get("current") === "on",
    featured: formData.get("featured") === "on",
  });
  if (!parsed.success) return fromZod(parsed.error);

  const { id, ...data } = parsed.data as { id?: string } & Record<
    string,
    unknown
  >;

  try {
    if (id) {
      // Scoping the update by profileId means another user's row matches
      // nothing, so there is no separate ownership read to forget.
      const result = await delegate(entry.model).updateMany({
        where: { id, profileId },
        data,
      });
      if (result.count === 0) return fail("That entry no longer exists.");
    } else {
      await delegate(entry.model).create({
        data: {
          ...data,
          profileId,
          sortIndex: await CareerService.nextSortIndex(profileId, entry.model),
        },
      });
    }

    refresh(entry.path);
    return ok(id ? "Updated." : "Added.");
  } catch (error) {
    return unexpected(error, `saveEntryAction:${kind}`);
  }
}

export async function deleteEntryAction(
  kind: EntryKind,
  id: string,
): Promise<ActionState> {
  const { profileId } = await requireProfile();
  const entry = REGISTRY[kind];

  try {
    const result = await delegate(entry.model).deleteMany({
      where: { id, profileId },
    });
    if (result.count === 0) return fail("That entry no longer exists.");

    refresh(entry.path);
    return ok("Deleted.");
  } catch (error) {
    return unexpected(error, `deleteEntryAction:${kind}`);
  }
}

/**
 * Reordering by one position at a time.
 *
 * Buttons rather than drag: every entry stays reorderable from the keyboard and
 * with a screen reader, which a drag handle alone would not give.
 */
export async function moveEntryAction(
  kind: EntryKind,
  id: string,
  direction: "up" | "down",
): Promise<ActionState> {
  const { profileId } = await requireProfile();
  const entry = REGISTRY[kind];

  try {
    const rows = await delegate(entry.model).findMany({
      where: { profileId },
      orderBy: { sortIndex: "asc" },
      select: { id: true, sortIndex: true },
    });

    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return fail("That entry no longer exists.");

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= rows.length) return ok();

    // Rewrite the whole run as 0..n-1: stored indexes can have gaps after
    // deletions, and swapping two values would preserve them.
    const reordered = [...rows];
    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];

    await db.$transaction(async (tx) => {
      const scoped = tx[entry.model] as unknown as Delegate;
      for (const [position, row] of reordered.entries()) {
        await scoped.updateMany({
          where: { id: row.id, profileId },
          data: { sortIndex: position },
        });
      }
    });

    refresh(entry.path);
    return ok();
  } catch (error) {
    return unexpected(error, `moveEntryAction:${kind}`);
  }
}

/* ------------------------------------------------------------ bulk skills */

export async function addSkillsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { profileId } = await requireProfile();

  const parsed = bulkSkillsSchema.safeParse({
    names: formData.get("names"),
    category: formData.get("category"),
  });
  if (!parsed.success) return fromZod(parsed.error);

  const { names, category } = parsed.data;
  if (names.length === 0) {
    return fail("Add at least one skill.", {
      names: "Separate skills with commas.",
    });
  }

  try {
    const start = await CareerService.nextSortIndex(profileId, "skill");

    // skipDuplicates leans on the unique (profileId, name) index, so re-adding
    // an existing skill is a no-op rather than an error.
    const result = await db.skill.createMany({
      data: names.map((name, i) => ({
        profileId,
        name,
        category,
        sortIndex: start + i,
      })),
      skipDuplicates: true,
    });

    refresh("/profile");
    return ok(
      result.count === names.length
        ? `Added ${result.count} skill${result.count === 1 ? "" : "s"}.`
        : `Added ${result.count}; the rest were already there.`,
    );
  } catch (error) {
    return unexpected(error, "addSkillsAction");
  }
}
