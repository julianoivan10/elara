"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";
import type { Education } from "@prisma/client";

import { dateRange } from "@/lib/format";
import { toMonthValue } from "@/lib/validation/profile";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { Field, FieldLabel, Input, Textarea } from "@/components/ui/field";
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
  ProfileSection,
  ReorderControls,
} from "@/features/profile/section";

const save = saveEntryAction.bind(null, "education");

export function EducationSection({ items }: { items: Education[] }) {
  return (
    <ProfileSection
      id="education"
      index="05"
      title="Education"
      count={items.length}
      description="Degrees, diplomas and courses. Include anything still in progress."
      action={
        <EntryDialog
          label="Education"
          title="Add education"
          action={save}
          submitLabel="Add"
          trigger={
            <Button variant="outline" size="sm">
              <Plus />
              Add
            </Button>
          }
        >
          {(state) => <EducationFields state={state} />}
        </EntryDialog>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          className="mt-5"
          title="Nothing here yet"
          description="A degree, a diploma, or a course you completed."
        />
      ) : (
        <div className="flex flex-col">
          {items.map((item, index) => (
            <EntryRow
              key={item.id}
              title={item.school}
              meta={dateRange(item.startDate, item.endDate, item.current)}
              subtitle={
                [
                  [item.degree, item.field].filter(Boolean).join(", "),
                  item.location,
                  item.grade,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
              controls={
                <>
                  <ReorderControls
                    label={item.school}
                    isFirst={index === 0}
                    isLast={index === items.length - 1}
                    onMove={(direction) =>
                      moveEntryAction("education", item.id, direction)
                    }
                  />
                  <EntryDialog
                    label="Education"
                    title="Edit education"
                    action={save}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${item.school}`}
                        title="Edit"
                      >
                        <Pencil />
                      </Button>
                    }
                  >
                    {(state) => <EducationFields state={state} entry={item} />}
                  </EntryDialog>
                  <DeleteEntryButton
                    name={item.school}
                    onConfirm={() => deleteEntryAction("education", item.id)}
                  />
                </>
              }
            >
              {item.description ? (
                <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
                  {item.description}
                </p>
              ) : null}
            </EntryRow>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

function EducationFields({
  state,
  entry,
}: {
  state: ActionState;
  entry?: Education;
}) {
  const [current, setCurrent] = React.useState(entry?.current ?? false);

  return (
    <>
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}

      <Field error={fieldError(state, "school")}>
        <FieldLabel>Institution</FieldLabel>
        <Input
          name="school"
          defaultValue={entry?.school ?? ""}
          required
          autoFocus
          placeholder="University of Porto"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={fieldError(state, "degree")}>
          <FieldLabel optional>Qualification</FieldLabel>
          <Input
            name="degree"
            defaultValue={entry?.degree ?? ""}
            placeholder="BSc"
          />
        </Field>

        <Field error={fieldError(state, "field")}>
          <FieldLabel optional>Subject</FieldLabel>
          <Input
            name="field"
            defaultValue={entry?.field ?? ""}
            placeholder="Informatics Engineering"
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field error={fieldError(state, "startDate")}>
          <FieldLabel optional>Started</FieldLabel>
          <Input
            name="startDate"
            type="month"
            defaultValue={toMonthValue(entry?.startDate)}
          />
        </Field>

        <Field error={fieldError(state, "endDate")}>
          <FieldLabel optional>Finished</FieldLabel>
          <Input
            name="endDate"
            type="month"
            defaultValue={toMonthValue(entry?.endDate)}
            disabled={current}
          />
        </Field>

        <Field error={fieldError(state, "grade")}>
          <FieldLabel optional>Result</FieldLabel>
          <Input
            name="grade"
            defaultValue={entry?.grade ?? ""}
            placeholder="16/20"
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
        Still studying
      </label>

      <Field error={fieldError(state, "location")}>
        <FieldLabel optional>Place</FieldLabel>
        <Input
          name="location"
          defaultValue={entry?.location ?? ""}
          placeholder="Porto"
        />
      </Field>

      <Field error={fieldError(state, "description")}>
        <FieldLabel optional>Anything worth adding</FieldLabel>
        <Textarea
          name="description"
          rows={3}
          defaultValue={entry?.description ?? ""}
          placeholder="Thesis, modules that are relevant, or an award."
        />
      </Field>
    </>
  );
}
