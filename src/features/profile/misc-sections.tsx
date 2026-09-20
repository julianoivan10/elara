"use client";

import { ExternalLink, Pencil, Plus } from "lucide-react";
import type {
  Achievement,
  Certification,
  Language,
  Link as ProfileLink,
} from "@prisma/client";

import { dateRange, humanizeEnum, monthYear } from "@/lib/format";
import { displayUrl } from "@/features/resume/document";
import { toMonthValue } from "@/lib/validation/profile";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import {
  Field,
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
  ProfileSection,
  ReorderControls,
} from "@/features/profile/section";

/** The add / edit / delete / reorder controls every small section shares. */
function RowControls({
  kind,
  id,
  name,
  index,
  total,
  title,
  fields,
}: {
  kind: "link" | "certification" | "language" | "achievement";
  id: string;
  name: string;
  index: number;
  total: number;
  title: string;
  fields: (state: ActionState) => React.ReactNode;
}) {
  return (
    <>
      <ReorderControls
        label={name}
        isFirst={index === 0}
        isLast={index === total - 1}
        onMove={(direction) => moveEntryAction(kind, id, direction)}
      />
      <EntryDialog
        label={humanizeEnum(kind)}
        title={title}
        action={saveEntryAction.bind(null, kind)}
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${name}`}
            title="Edit"
          >
            <Pencil />
          </Button>
        }
      >
        {fields}
      </EntryDialog>
      <DeleteEntryButton
        name={name}
        onConfirm={() => deleteEntryAction(kind, id)}
      />
    </>
  );
}

/* ------------------------------------------------------------------- links */

export function LinksSection({ items }: { items: ProfileLink[] }) {
  const fields = (entry?: ProfileLink) =>
    function LinkFields(state: ActionState) {
      return (
        <>
          {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
          <Field error={fieldError(state, "label")}>
            <FieldLabel>Label</FieldLabel>
            <Input
              name="label"
              defaultValue={entry?.label ?? ""}
              required
              autoFocus
              placeholder="GitHub"
            />
          </Field>
          <Field error={fieldError(state, "url")}>
            <FieldLabel>Address</FieldLabel>
            <Input
              name="url"
              type="url"
              defaultValue={entry?.url ?? ""}
              required
              placeholder="https://github.com/you"
            />
          </Field>
        </>
      );
    };

  return (
    <ProfileSection
      id="links"
      index="02"
      title="Links"
      count={items.length}
      description="A portfolio, a repository, writing — anything you want a reader to open."
      action={
        <EntryDialog
          size="sm"
          label="Links"
          title="Add a link"
          action={saveEntryAction.bind(null, "link")}
          submitLabel="Add link"
          trigger={
            <Button variant="outline" size="sm">
              <Plus />
              Add link
            </Button>
          }
        >
          {fields()}
        </EntryDialog>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          className="mt-5"
          title="No links yet"
          description="Most resumes are stronger with one or two places to look."
        />
      ) : (
        <div className="flex flex-col">
          {items.map((item, index) => (
            <EntryRow
              key={item.id}
              title={item.label}
              subtitle={
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cobalt-ink underline decoration-cobalt-soft underline-offset-4 hover:decoration-cobalt-ink"
                >
                  {displayUrl(item.url)}
                  <ExternalLink className="size-3" />
                </a>
              }
              controls={
                <RowControls
                  kind="link"
                  id={item.id}
                  name={item.label}
                  index={index}
                  total={items.length}
                  title="Edit link"
                  fields={fields(item)}
                />
              }
            />
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

/* ---------------------------------------------------------- certifications */

export function CertificationsSection({ items }: { items: Certification[] }) {
  const fields = (entry?: Certification) =>
    function CertificationFields(state: ActionState) {
      return (
        <>
          {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
          <Field error={fieldError(state, "name")}>
            <FieldLabel>Certification</FieldLabel>
            <Input
              name="name"
              defaultValue={entry?.name ?? ""}
              required
              autoFocus
              placeholder="IAAP Web Accessibility Specialist"
            />
          </Field>
          <Field error={fieldError(state, "issuer")}>
            <FieldLabel optional>Issued by</FieldLabel>
            <Input
              name="issuer"
              defaultValue={entry?.issuer ?? ""}
              placeholder="IAAP"
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={fieldError(state, "issueDate")}>
              <FieldLabel optional>Issued</FieldLabel>
              <Input
                name="issueDate"
                type="month"
                defaultValue={toMonthValue(entry?.issueDate)}
              />
            </Field>
            <Field error={fieldError(state, "expiryDate")}>
              <FieldLabel optional>Expires</FieldLabel>
              <Input
                name="expiryDate"
                type="month"
                defaultValue={toMonthValue(entry?.expiryDate)}
              />
            </Field>
          </div>
          <Field error={fieldError(state, "url")}>
            <FieldLabel optional>Verification link</FieldLabel>
            <Input name="url" type="url" defaultValue={entry?.url ?? ""} />
          </Field>
        </>
      );
    };

  return (
    <ProfileSection
      id="certifications"
      index="06"
      title="Certifications"
      count={items.length}
      description="Formal credentials with an issuer behind them."
      action={
        <EntryDialog
          label="Certifications"
          title="Add a certification"
          action={saveEntryAction.bind(null, "certification")}
          submitLabel="Add"
          trigger={
            <Button variant="outline" size="sm">
              <Plus />
              Add
            </Button>
          }
        >
          {fields()}
        </EntryDialog>
      }
    >
      {items.length === 0 ? (
        <EmptyState className="mt-5" title="None recorded" />
      ) : (
        <div className="flex flex-col">
          {items.map((item, index) => (
            <EntryRow
              key={item.id}
              title={item.name}
              meta={dateRange(item.issueDate, item.expiryDate, false)}
              subtitle={item.issuer ?? undefined}
              controls={
                <RowControls
                  kind="certification"
                  id={item.id}
                  name={item.name}
                  index={index}
                  total={items.length}
                  title="Edit certification"
                  fields={fields(item)}
                />
              }
            />
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

/* --------------------------------------------------------------- languages */

const PROFICIENCIES = [
  "BASIC",
  "CONVERSATIONAL",
  "PROFESSIONAL",
  "FLUENT",
  "NATIVE",
] as const;

export function LanguagesSection({ items }: { items: Language[] }) {
  const fields = (entry?: Language) =>
    function LanguageFields(state: ActionState) {
      return (
        <>
          {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
          <Field error={fieldError(state, "name")}>
            <FieldLabel>Language</FieldLabel>
            <Input
              name="name"
              defaultValue={entry?.name ?? ""}
              required
              autoFocus
              placeholder="Portuguese"
            />
          </Field>
          <Field>
            <FieldLabel>Proficiency</FieldLabel>
            <NativeSelect
              name="proficiency"
              defaultValue={entry?.proficiency ?? "PROFESSIONAL"}
            >
              {PROFICIENCIES.map((value) => (
                <option key={value} value={value}>
                  {humanizeEnum(value)}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </>
      );
    };

  return (
    <ProfileSection
      id="languages"
      index="07"
      title="Languages"
      count={items.length}
      action={
        <EntryDialog
          size="sm"
          label="Languages"
          title="Add a language"
          action={saveEntryAction.bind(null, "language")}
          submitLabel="Add"
          trigger={
            <Button variant="outline" size="sm">
              <Plus />
              Add
            </Button>
          }
        >
          {fields()}
        </EntryDialog>
      }
    >
      {items.length === 0 ? (
        <EmptyState className="mt-5" title="None recorded" />
      ) : (
        <div className="flex flex-col">
          {items.map((item, index) => (
            <EntryRow
              key={item.id}
              title={item.name}
              meta={humanizeEnum(item.proficiency)}
              controls={
                <RowControls
                  kind="language"
                  id={item.id}
                  name={item.name}
                  index={index}
                  total={items.length}
                  title="Edit language"
                  fields={fields(item)}
                />
              }
            />
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

/* ------------------------------------------------------------ achievements */

export function AchievementsSection({ items }: { items: Achievement[] }) {
  const fields = (entry?: Achievement) =>
    function AchievementFields(state: ActionState) {
      return (
        <>
          {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
          <Field error={fieldError(state, "title")}>
            <FieldLabel>What was it</FieldLabel>
            <Input
              name="title"
              defaultValue={entry?.title ?? ""}
              required
              autoFocus
              placeholder="Speaker, Front-end Lisbon"
            />
          </Field>
          <Field error={fieldError(state, "date")}>
            <FieldLabel optional>When</FieldLabel>
            <Input
              name="date"
              type="month"
              defaultValue={toMonthValue(entry?.date)}
            />
          </Field>
          <Field error={fieldError(state, "description")}>
            <FieldLabel optional>Detail</FieldLabel>
            <Textarea
              name="description"
              rows={3}
              defaultValue={entry?.description ?? ""}
            />
          </Field>
        </>
      );
    };

  return (
    <ProfileSection
      id="achievements"
      index="08"
      title="Achievements"
      count={items.length}
      description="Awards, talks, publications — anything that is evidence but is not a job."
      action={
        <EntryDialog
          label="Achievements"
          title="Add an achievement"
          action={saveEntryAction.bind(null, "achievement")}
          submitLabel="Add"
          trigger={
            <Button variant="outline" size="sm">
              <Plus />
              Add
            </Button>
          }
        >
          {fields()}
        </EntryDialog>
      }
    >
      {items.length === 0 ? (
        <EmptyState className="mt-5" title="None recorded" />
      ) : (
        <div className="flex flex-col">
          {items.map((item, index) => (
            <EntryRow
              key={item.id}
              title={item.title}
              meta={monthYear(item.date) ?? undefined}
              controls={
                <RowControls
                  kind="achievement"
                  id={item.id}
                  name={item.title}
                  index={index}
                  total={items.length}
                  title="Edit achievement"
                  fields={fields(item)}
                />
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
