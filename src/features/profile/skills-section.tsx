"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import type { Skill } from "@prisma/client";

import { cn } from "@/lib/cn";
import { humanizeEnum } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { Field, FieldHint, FieldLabel, Input } from "@/components/ui/field";
import { fieldError } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { Eyebrow } from "@/components/ui/editorial";
import {
  addSkillsAction,
  deleteEntryAction,
} from "@/server/actions/profile.actions";
import { EntryDialog } from "@/features/profile/entry-dialog";
import { SkillSuggestions } from "@/features/ai/skill-suggestions";
import { ProfileSection } from "@/features/profile/section";

/**
 * Skills are added several at a time and removed with one click.
 *
 * A dialog per skill would be absurd for a list people fill in thirty at a
 * time, so this section trades the usual edit flow for speed: type a comma-
 * separated list, pick a group, done.
 */
export function SkillsSection({
  items,
  aiEnabled = false,
}: {
  items: Skill[];
  aiEnabled?: boolean;
}) {
  const grouped = React.useMemo(() => {
    const map = new Map<string, Skill[]>();
    for (const skill of items) {
      const key = skill.category?.trim() || "Other";
      map.set(key, [...(map.get(key) ?? []), skill]);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <ProfileSection
      id="skills"
      index="05"
      title="Skills"
      count={items.length}
      description="What job filters and keyword scans look for. Group them so they read well on a resume."
      action={
        <div className="flex flex-wrap items-center gap-1.5">
          {aiEnabled ? <SkillSuggestions /> : null}
          <EntryDialog
            label="Skills"
            title="Add skills"
            description="Add as many as you like at once, separated by commas."
            action={addSkillsAction}
            submitLabel="Add skills"
            trigger={
              <Button variant="outline" size="sm">
                <Plus />
                Add skills
              </Button>
            }
          >
            {(state) => (
              <>
                <Field error={fieldError(state, "names")}>
                  <FieldLabel>Skills</FieldLabel>
                  <Input
                    name="names"
                    required
                    autoFocus
                    placeholder="TypeScript, React, Accessibility"
                  />
                  <FieldHint>
                    Separated by commas. Duplicates are ignored.
                  </FieldHint>
                </Field>

                <Field error={fieldError(state, "category")}>
                  <FieldLabel optional>Group</FieldLabel>
                  <Input
                    name="category"
                    placeholder="Languages"
                    list="skill-groups"
                  />
                  <datalist id="skill-groups">
                    <option value="Languages" />
                    <option value="Tools" />
                    <option value="Practice" />
                    <option value="Frameworks" />
                  </datalist>
                  <FieldHint>
                    Groups become the labelled rows in your resume&apos;s skills
                    section.
                  </FieldHint>
                </Field>
              </>
            )}
          </EntryDialog>
        </div>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          className="mt-5"
          title="No skills yet"
          description="Five or more makes your profile far easier to match against a job."
        />
      ) : (
        <div className="flex flex-col gap-5 pt-5">
          {grouped.map(([group, skills]) => (
            <div key={group} className="flex flex-col gap-2">
              {grouped.length > 1 || group !== "Other" ? (
                <Eyebrow>{group}</Eyebrow>
              ) : null}
              <ul className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <SkillChip key={skill.id} skill={skill} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

const LEVEL_RING: Record<Skill["level"], string> = {
  FAMILIAR: "bg-sunk",
  PROFICIENT: "bg-ink-ghost",
  ADVANCED: "bg-ink-faint",
  EXPERT: "bg-ink",
};

function SkillChip({ skill }: { skill: Skill }) {
  const [pending, startTransition] = React.useTransition();
  const { toast } = useToast();

  const remove = () =>
    startTransition(async () => {
      const result = await deleteEntryAction("skill", skill.id);
      if (result.status === "error") {
        toast(result.message ?? "Could not remove that.", { tone: "error" });
      }
    });

  return (
    <li
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-xs border border-rule bg-surface py-0.5 pl-2 pr-1 text-[0.8125rem] text-ink transition-opacity",
        pending && "opacity-40",
      )}
    >
      <span
        aria-hidden
        title={humanizeEnum(skill.level)}
        className={cn("size-1.5 rounded-full", LEVEL_RING[skill.level])}
      />
      {skill.name}
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label={`Remove ${skill.name}`}
        className="flex size-4 items-center justify-center rounded-[2px] text-ink-ghost transition-colors hover:bg-danger-tint hover:text-danger"
      >
        <X className="size-3" />
      </button>
    </li>
  );
}
