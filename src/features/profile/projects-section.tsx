"use client";

import * as React from "react";
import { Code2, ExternalLink, Pencil, Plus, Star } from "lucide-react";
import type { Project } from "@prisma/client";

import { cn } from "@/lib/cn";
import { dateRange } from "@/lib/format";
import { displayUrl } from "@/features/resume/document";
import { toMonthValue } from "@/lib/validation/profile";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import {
  Field,
  FieldHint,
  FieldLabel,
  Input,
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

const save = saveEntryAction.bind(null, "project");

export function AddProjectButton({
  label = "Add project",
}: {
  label?: string;
}) {
  return (
    <EntryDialog
      size="lg"
      label="Projects"
      title="Add a project"
      action={save}
      submitLabel="Add project"
      trigger={
        <Button variant="outline" size="sm">
          <Plus />
          {label}
        </Button>
      }
    >
      {(state) => <ProjectFields state={state} />}
    </EntryDialog>
  );
}

/**
 * Used on both the profile and the portfolio page. The portfolio view sets
 * `standalone`, which drops the numbered section chrome and lets the page own
 * its own header.
 */
export function ProjectsSection({
  items,
  standalone = false,
}: {
  items: Project[];
  standalone?: boolean;
}) {
  const list =
    items.length === 0 ? (
      <EmptyState
        className={standalone ? "" : "mt-5"}
        title="No projects yet"
        description="Coursework, side projects and open-source work all count — and they are often the strongest evidence early in a career."
        action={<AddProjectButton />}
      />
    ) : (
      <div className="flex flex-col">
        {items.map((item, index) => (
          <EntryRow
            key={item.id}
            title={
              <span className="inline-flex items-center gap-2">
                {item.name}
                {item.featured ? (
                  <Star
                    className="size-3 fill-lime text-lime-deep"
                    aria-label="Featured"
                  />
                ) : null}
              </span>
            }
            meta={dateRange(item.startDate, item.endDate, item.current)}
            subtitle={item.role ?? undefined}
            controls={
              <>
                <ReorderControls
                  label={item.name}
                  isFirst={index === 0}
                  isLast={index === items.length - 1}
                  onMove={(direction) =>
                    moveEntryAction("project", item.id, direction)
                  }
                />
                <EntryDialog
                  size="lg"
                  label="Projects"
                  title="Edit project"
                  action={save}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${item.name}`}
                      title="Edit"
                    >
                      <Pencil />
                    </Button>
                  }
                >
                  {(state) => <ProjectFields state={state} entry={item} />}
                </EntryDialog>
                <DeleteEntryButton
                  name={item.name}
                  onConfirm={() => deleteEntryAction("project", item.id)}
                />
              </>
            }
          >
            {item.description ? (
              <p className="mb-2.5 text-[0.8125rem] leading-relaxed text-ink-muted">
                {item.description}
              </p>
            ) : null}

            <Highlights items={item.highlights} />

            {item.technologies.length > 0 ? (
              <div className="mt-2.5">
                <TagList items={item.technologies} />
              </div>
            ) : null}

            {item.url || item.repoUrl ? (
              <div className="mt-2.5 flex flex-wrap gap-4">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[0.75rem] text-cobalt-ink underline decoration-cobalt-soft underline-offset-4 hover:decoration-cobalt-ink"
                  >
                    <ExternalLink className="size-3" />
                    {displayUrl(item.url)}
                  </a>
                ) : null}
                {item.repoUrl ? (
                  <a
                    href={item.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[0.75rem] text-ink-muted underline decoration-rule-strong underline-offset-4 hover:text-ink"
                  >
                    <Code2 className="size-3" />
                    {displayUrl(item.repoUrl)}
                  </a>
                ) : null}
              </div>
            ) : null}
          </EntryRow>
        ))}
      </div>
    );

  if (standalone) return list;

  return (
    <ProfileSection
      id="projects"
      index="09"
      title="Projects"
      count={items.length}
      description="Work you can point at. Managed in full under Projects."
      action={<AddProjectButton />}
    >
      {list}
    </ProfileSection>
  );
}

function ProjectFields({
  state,
  entry,
}: {
  state: ActionState;
  entry?: Project;
}) {
  const [current, setCurrent] = React.useState(entry?.current ?? false);

  return (
    <>
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={fieldError(state, "name")}>
          <FieldLabel>Name</FieldLabel>
          <Input
            name="name"
            defaultValue={entry?.name ?? ""}
            required
            autoFocus
            placeholder="Tideline"
          />
        </Field>

        <Field error={fieldError(state, "role")}>
          <FieldLabel optional>Your part in it</FieldLabel>
          <Input
            name="role"
            defaultValue={entry?.role ?? ""}
            placeholder="Design and build"
          />
        </Field>
      </div>

      <Field error={fieldError(state, "description")}>
        <FieldLabel optional>What it is</FieldLabel>
        <Textarea
          name="description"
          rows={3}
          defaultValue={entry?.description ?? ""}
          placeholder="One or two sentences. Assume the reader has never heard of it."
        />
      </Field>

      <Field error={fieldError(state, "highlights")}>
        <FieldLabel optional>What was interesting about it</FieldLabel>
        <Textarea
          name="highlights"
          rows={3}
          defaultValue={entry?.highlights.join("\n") ?? ""}
          placeholder="One per line."
        />
        <FieldHint>
          One per line — the hard part, or what you learned.
        </FieldHint>
      </Field>

      <Field error={fieldError(state, "technologies")}>
        <FieldLabel optional>Built with</FieldLabel>
        <Input
          name="technologies"
          defaultValue={entry?.technologies.join(", ") ?? ""}
          placeholder="TypeScript, React, IndexedDB"
        />
        <FieldHint>Separated by commas.</FieldHint>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={fieldError(state, "url")}>
          <FieldLabel optional>Link</FieldLabel>
          <Input
            name="url"
            type="url"
            defaultValue={entry?.url ?? ""}
            placeholder="https://…"
          />
        </Field>

        <Field error={fieldError(state, "repoUrl")}>
          <FieldLabel optional>Source</FieldLabel>
          <Input
            name="repoUrl"
            type="url"
            defaultValue={entry?.repoUrl ?? ""}
            placeholder="https://github.com/…"
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
          <FieldLabel optional>Finished</FieldLabel>
          <Input
            name="endDate"
            type="month"
            defaultValue={toMonthValue(entry?.endDate)}
            disabled={current}
          />
        </Field>
      </div>

      <div className={cn("flex flex-wrap gap-x-6 gap-y-3")}>
        <label className="flex items-center gap-2.5 text-[0.8125rem] text-ink">
          <input
            type="checkbox"
            name="current"
            checked={current}
            onChange={(event) => setCurrent(event.target.checked)}
            className="size-4 accent-[var(--color-ink)]"
          />
          Still working on it
        </label>

        <label className="flex items-center gap-2.5 text-[0.8125rem] text-ink">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={entry?.featured ?? false}
            className="size-4 accent-[var(--color-ink)]"
          />
          Feature this one
        </label>
      </div>
    </>
  );
}
