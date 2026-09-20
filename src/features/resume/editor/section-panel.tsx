"use client";

import * as React from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, RotateCcw } from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/editorial";
import type { SectionConfig } from "@/features/resume/project-document";
import type { ProjectionProfile } from "@/features/resume/project-document";

export type EditorSection = {
  id: string;
  kind: string;
  title: string;
  visible: boolean;
  sortIndex: number;
  config: SectionConfig;
};

/**
 * The editor's left rail: which sections are on the page, in what order, and
 * which entries within them.
 *
 * Reordering uses buttons rather than drag so it stays usable from a keyboard
 * and on a phone, where this rail becomes a full-width tab.
 */
export function SectionPanel({
  sections,
  profile,
  selectedId,
  onSelect,
  onToggleVisible,
  onRenameSection,
  onMove,
  onConfigChange,
}: {
  sections: EditorSection[];
  profile: ProjectionProfile | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onToggleVisible: (id: string, visible: boolean) => void;
  onRenameSection: (id: string, title: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onConfigChange: (id: string, config: SectionConfig) => void;
}) {
  // HEADER is always first and always on; it is the contact block, not a
  // section that can be dropped.
  const [header, ...rest] = [
    sections.find((s) => s.kind === "HEADER"),
    ...sections.filter((s) => s.kind !== "HEADER"),
  ];

  return (
    <div className="flex flex-col gap-5">
      {header ? (
        <div className="flex flex-col gap-3">
          <Eyebrow>Contact details</Eyebrow>
          <HeaderOptions
            section={header}
            profile={profile}
            onConfigChange={onConfigChange}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Eyebrow>Sections</Eyebrow>

        <ul className="flex flex-col">
          {rest.map((section, index) => {
            if (!section) return null;
            const selected = section.id === selectedId;

            return (
              <li
                key={section.id}
                className="border-b border-rule last:border-b-0"
              >
                <div className="flex items-center gap-1 py-1.5">
                  <span
                    data-numeric
                    className={cn(
                      "w-5 shrink-0 font-mono text-[0.625rem]",
                      section.visible ? "text-ink-ghost" : "text-ink-ghost/50",
                    )}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <button
                    type="button"
                    onClick={() => onSelect(selected ? null : section.id)}
                    aria-expanded={selected}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 rounded-sm px-1.5 py-1 text-left text-[0.8125rem] transition-colors",
                      section.visible ? "text-ink" : "text-ink-ghost",
                      "hover:bg-raised",
                    )}
                  >
                    <span className="truncate">{section.title}</span>
                    <ChevronDown
                      className={cn(
                        "ml-auto size-3 shrink-0 text-ink-ghost transition-transform duration-200",
                        selected && "rotate-180",
                      )}
                    />
                  </button>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onMove(section.id, "up")}
                    disabled={index === 0}
                    aria-label={`Move ${section.title} up`}
                  >
                    <ChevronUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onMove(section.id, "down")}
                    disabled={index === rest.length - 1}
                    aria-label={`Move ${section.title} down`}
                  >
                    <ChevronDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      onToggleVisible(section.id, !section.visible)
                    }
                    aria-label={
                      section.visible
                        ? `Hide ${section.title}`
                        : `Show ${section.title}`
                    }
                    title={section.visible ? "On the page" : "Hidden"}
                  >
                    {section.visible ? <Eye /> : <EyeOff />}
                  </Button>
                </div>

                {selected ? (
                  <div className="flex flex-col gap-4 pb-4 pl-6 pr-1 pt-1">
                    <label className="flex flex-col gap-1.5">
                      <span className="eyebrow">Heading on the page</span>
                      <input
                        value={section.title}
                        onChange={(event) =>
                          onRenameSection(section.id, event.target.value)
                        }
                        className="w-full rounded-none border-0 border-b border-rule bg-transparent pb-1.5 text-[0.8125rem] text-ink outline-none focus:border-cobalt"
                      />
                    </label>

                    <SectionOptions
                      section={section}
                      profile={profile}
                      onConfigChange={onConfigChange}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ header */

const CONTACT_FIELDS = [
  { key: "showEmail", label: "Email" },
  { key: "showPhone", label: "Phone" },
  { key: "showLocation", label: "Location" },
  { key: "showWebsite", label: "Website" },
] as const;

function HeaderOptions({
  section,
  profile,
  onConfigChange,
}: {
  section: EditorSection;
  profile: ProjectionProfile | null;
  onConfigChange: (id: string, config: SectionConfig) => void;
}) {
  const available: Record<string, string | null> = {
    showEmail: profile?.email ?? null,
    showPhone: profile?.phone ?? null,
    showLocation: profile?.location ?? null,
    showWebsite: profile?.website ?? null,
  };

  return (
    <div className="flex flex-col gap-1.5">
      {CONTACT_FIELDS.map((field) => {
        const value = available[field.key];
        return (
          <label
            key={field.key}
            className={cn(
              "flex items-center gap-2.5 text-[0.8125rem]",
              value ? "text-ink" : "text-ink-ghost",
            )}
          >
            <input
              type="checkbox"
              checked={section.config[field.key]}
              disabled={!value}
              onChange={(event) =>
                onConfigChange(section.id, {
                  ...section.config,
                  [field.key]: event.target.checked,
                })
              }
              className="size-3.5 accent-[var(--color-ink)]"
            />
            <span className="shrink-0">{field.label}</span>
            <span className="truncate text-ink-faint">
              {value ?? "not set on your profile"}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- options */

/** Which profile entries a section can include, by kind. */
function entriesFor(kind: string, profile: ProjectionProfile | null) {
  switch (kind) {
    case "EXPERIENCE":
      return (profile?.experience ?? []).map((item) => ({
        id: item.id,
        label: `${item.role} — ${item.company}`,
      }));
    case "EDUCATION":
      return (profile?.education ?? []).map((item) => ({
        id: item.id,
        label: item.school,
      }));
    case "PROJECTS":
      return (profile?.projects ?? []).map((item) => ({
        id: item.id,
        label: item.name,
      }));
    case "SKILLS":
      return (profile?.skills ?? []).map((item) => ({
        id: item.id,
        label: item.name,
      }));
    case "CERTIFICATIONS":
      return (profile?.certifications ?? []).map((item) => ({
        id: item.id,
        label: item.name,
      }));
    case "LANGUAGES":
      return (profile?.languages ?? []).map((item) => ({
        id: item.id,
        label: item.name,
      }));
    case "ACHIEVEMENTS":
      return (profile?.achievements ?? []).map((item) => ({
        id: item.id,
        label: item.title,
      }));
    case "LINKS":
      return (profile?.links ?? []).map((item) => ({
        id: item.id,
        label: item.label,
      }));
    default:
      return [];
  }
}

function SectionOptions({
  section,
  profile,
  onConfigChange,
}: {
  section: EditorSection;
  profile: ProjectionProfile | null;
  onConfigChange: (id: string, config: SectionConfig) => void;
}) {
  const entries = entriesFor(section.kind, profile);
  const excluded = new Set(section.config.excludedIds);

  if (section.kind === "SUMMARY") {
    const overridden = section.config.text !== undefined;

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow">Summary text</span>
          {overridden ? (
            <button
              type="button"
              onClick={() => {
                const next = { ...section.config };
                delete next.text;
                onConfigChange(section.id, next);
              }}
              className="inline-flex items-center gap-1 text-[0.6875rem] text-ink-muted hover:text-ink"
            >
              <RotateCcw className="size-3" />
              Use profile summary
            </button>
          ) : null}
        </div>

        <textarea
          rows={7}
          value={section.config.text ?? profile?.summary ?? ""}
          onChange={(event) =>
            onConfigChange(section.id, {
              ...section.config,
              text: event.target.value,
            })
          }
          className="w-full resize-y rounded-sm border border-rule bg-surface p-2.5 text-[0.8125rem] leading-relaxed text-ink outline-none focus:border-cobalt"
        />

        <p className="text-[0.6875rem] leading-snug text-ink-faint">
          {overridden
            ? "This resume uses its own summary. Your profile is unchanged."
            : "Editing here writes a summary for this resume only."}
        </p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-[0.75rem] leading-relaxed text-ink-faint">
        Nothing on your profile fills this section yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="eyebrow">Include</span>
        {entries.map((entry) => (
          <label
            key={entry.id}
            className="flex items-start gap-2.5 text-[0.8125rem] text-ink"
          >
            <input
              type="checkbox"
              checked={!excluded.has(entry.id)}
              onChange={(event) => {
                const next = new Set(excluded);
                if (event.target.checked) next.delete(entry.id);
                else next.add(entry.id);
                onConfigChange(section.id, {
                  ...section.config,
                  excludedIds: [...next],
                });
              }}
              className="mt-0.5 size-3.5 shrink-0 accent-[var(--color-ink)]"
            />
            <span className="min-w-0 flex-1 leading-snug">{entry.label}</span>
          </label>
        ))}
      </div>

      {section.kind === "SKILLS" ? (
        <label className="flex items-center gap-2.5 border-t border-rule pt-3 text-[0.8125rem] text-ink">
          <input
            type="checkbox"
            checked={section.config.groupSkills}
            onChange={(event) =>
              onConfigChange(section.id, {
                ...section.config,
                groupSkills: event.target.checked,
              })
            }
            className="size-3.5 accent-[var(--color-ink)]"
          />
          Group by category
        </label>
      ) : null}

      {section.kind === "EXPERIENCE" || section.kind === "PROJECTS" ? (
        <label className="flex flex-col gap-1.5 border-t border-rule pt-3">
          <span className="eyebrow">Bullets per entry</span>
          <select
            value={section.config.maxHighlights ?? ""}
            onChange={(event) =>
              onConfigChange(section.id, {
                ...section.config,
                maxHighlights: event.target.value
                  ? Number(event.target.value)
                  : undefined,
              })
            }
            className="rounded-sm border border-rule bg-surface px-2 py-1.5 text-[0.8125rem] text-ink outline-none focus:border-cobalt"
          >
            <option value="">All of them</option>
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                At most {n}
              </option>
            ))}
          </select>
          <span className="text-[0.6875rem] leading-snug text-ink-faint">
            A quick way to get a long history onto one page.
          </span>
        </label>
      ) : null}
    </div>
  );
}
