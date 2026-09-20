"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";
import type { Experience } from "@prisma/client";

import { dateRange, duration, humanizeEnum } from "@/lib/format";
import { toMonthValue } from "@/lib/validation/profile";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import {
  Field,
  FieldHint,
  FieldLabel,
  Input,
  NativeSelect,
  Textarea,
} from "@/components/ui/field";
import { fieldError } from "@/components/ui/form";
import {
  deleteEntryAction,
  moveEntryAction,
  saveEntryAction,
} from "@/server/actions/profile.actions";
import type { ActionState } from "@/server/actions/result";
import {
  DeleteEntryButton,
  EntryDialog,
} from "@/features/profile/entry-dialog";
import {
  EntryRow,
  Highlights,
  ProfileSection,
  ReorderControls,
  TagList,
} from "@/features/profile/section";

const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "FREELANCE",
  "VOLUNTEER",
] as const;

const LOCATION_TYPES = ["ONSITE", "HYBRID", "REMOTE"] as const;

const save = saveEntryAction.bind(null, "experience");

export function ExperienceSection({ items }: { items: Experience[] }) {
  return (
    <ProfileSection
      id="experience"
      index="03"
      title="Experience"
      count={items.length}
      description="Roles, internships, freelance work and volunteering. What changed because you were there matters more than the job description."
      action={
        <EntryDialog
          size="lg"
          label="Experience"
          title="Add a role"
          action={save}
          submitLabel="Add role"
          trigger={
            <Button variant="outline" size="sm">
              <Plus />
              Add role
            </Button>
          }
        >
          {(state) => <ExperienceFields state={state} />}
        </EntryDialog>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          className="mt-5"
          title="No roles yet"
          description="A part-time job, an internship or volunteering all count. Add the most recent one first."
        />
      ) : (
        <div className="flex flex-col">
          {items.map((item, index) => (
            <EntryRow
              key={item.id}
              title={item.role}
              meta={dateRange(item.startDate, item.endDate, item.current)}
              subtitle={
                <>
                  <span className="font-medium text-ink">{item.company}</span>
                  {item.location ? ` · ${item.location}` : ""}
                  {` · ${humanizeEnum(item.employmentType)}`}
                  {item.locationType !== "ONSITE"
                    ? ` · ${humanizeEnum(item.locationType)}`
                    : ""}
                  {item.startDate
                    ? ` · ${duration(item.startDate, item.endDate, item.current)}`
                    : ""}
                </>
              }
              controls={
                <>
                  <ReorderControls
                    label={item.role}
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                    onMove={(direction) =>
                      moveEntryAction("experience", item.id, direction)
                    }
                  />
                  <EntryDialog
                    size="lg"
                    label="Experience"
                    title="Edit role"
                    action={save}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${item.role}`}
                        title="Edit"
                      >
                        <Pencil />
                      </Button>
                    }
                  >
                    {(state) => <ExperienceFields state={state} entry={item} />}
                  </EntryDialog>
                  <DeleteEntryButton
                    name={`${item.role} at ${item.company}`}
                    onConfirm={() => deleteEntryAction("experience", item.id)}
                  />
                </>
              }
            >
              {item.summary ? (
                <p className="mb-2.5 text-[0.8125rem] leading-relaxed text-ink-muted">
                  {item.summary}
                </p>
              ) : null}
              <Highlights items={item.highlights} />
              {item.skills.length > 0 ? (
                <div className="mt-2.5">
                  <TagList items={item.skills} />
                </div>
              ) : null}
            </EntryRow>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

function ExperienceFields({
  state,
  entry,
}: {
  state: ActionState;
  entry?: Experience;
}) {
  // Disable the end date while "still here" is checked, rather than letting a
  // contradictory pair be submitted and rejected.
  const [current, setCurrent] = React.useState(entry?.current ?? false);

  return (
    <>
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={fieldError(state, "role")}>
          <FieldLabel>Role</FieldLabel>
          <Input
            name="role"
            defaultValue={entry?.role ?? ""}
            required
            autoFocus
            placeholder="Front-end engineer"
          />
        </Field>

        <Field error={fieldError(state, "company")}>
          <FieldLabel>Organisation</FieldLabel>
          <Input
            name="company"
            defaultValue={entry?.company ?? ""}
            required
            placeholder="Norwind"
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field>
          <FieldLabel>Type</FieldLabel>
          <NativeSelect
            name="employmentType"
            defaultValue={entry?.employmentType ?? "FULL_TIME"}
          >
            {EMPLOYMENT_TYPES.map((value) => (
              <option key={value} value={value}>
                {humanizeEnum(value)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field>
          <FieldLabel>Arrangement</FieldLabel>
          <NativeSelect
            name="locationType"
            defaultValue={entry?.locationType ?? "ONSITE"}
          >
            {LOCATION_TYPES.map((value) => (
              <option key={value} value={value}>
                {humanizeEnum(value)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field error={fieldError(state, "location")}>
          <FieldLabel optional>Place</FieldLabel>
          <Input
            name="location"
            defaultValue={entry?.location ?? ""}
            placeholder="Lisbon"
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={fieldError(state, "startDate")}>
          <FieldLabel optional>Started</FieldLabel>
          <Input
            name="startDate"
            type="month"
            defaultValue={toMonthValue(entry?.startDate)}
          />
        </Field>

        <Field error={fieldError(state, "endDate")}>
          <FieldLabel optional>Ended</FieldLabel>
          <Input
            name="endDate"
            type="month"
            defaultValue={toMonthValue(entry?.endDate)}
            disabled={current}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2.5 text-[0.8125rem] text-ink">
        <input
          type="checkbox"
          name="current"
          checked={current}
          onChange={(event) => setCurrent(event.target.checked)}
          className="size-4 accent-[var(--color-ink)]"
        />
        I am still in this role
      </label>

      <Field error={fieldError(state, "summary")}>
        <FieldLabel optional>What the role was</FieldLabel>
        <Textarea
          name="summary"
          rows={2}
          defaultValue={entry?.summary ?? ""}
          placeholder="One sentence of context, if the job title does not say enough."
        />
      </Field>

      <Field error={fieldError(state, "highlights")}>
        <FieldLabel optional>What you did</FieldLabel>
        <Textarea
          name="highlights"
          rows={5}
          defaultValue={entry?.highlights.join("\n") ?? ""}
          placeholder={
            "One per line.\nRebuilt the component library four teams ship against."
          }
        />
        <FieldHint>
          One per line. Start with the verb, and say what changed — these become
          the bullets on your resume.
        </FieldHint>
      </Field>

      <Field error={fieldError(state, "skills")}>
        <FieldLabel optional>Skills used</FieldLabel>
        <Input
          name="skills"
          defaultValue={entry?.skills.join(", ") ?? ""}
          placeholder="TypeScript, React, Accessibility"
        />
        <FieldHint>Separated by commas.</FieldHint>
      </Field>
    </>
  );
}
