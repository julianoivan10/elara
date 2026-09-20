"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Download,
  LoaderCircle,
  Minus,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveTheme } from "@/features/resume/document";
import {
  projectDocument,
  type ProjectionProfile,
  type SectionConfig,
} from "@/features/resume/project-document";
import { ResumePage } from "@/features/resume/resume-page";
import {
  reorderResumeSectionsAction,
  updateResumeMetaAction,
  updateResumeSectionAction,
} from "@/server/actions/resume.actions";
import {
  useAutosave,
  type SaveStatus,
} from "@/features/resume/editor/use-autosave";
import {
  SectionPanel,
  type EditorSection,
} from "@/features/resume/editor/section-panel";
import {
  DesignPanel,
  type ResumeMeta,
} from "@/features/resume/editor/design-panel";
import { TailorPanel } from "@/features/resume/editor/tailor-panel";

/**
 * The resume editor.
 *
 * All editing state lives here and the preview is derived from it with the same
 * pure projection the server uses for the PDF, so the page updates as you type
 * with no round trip. Persistence happens behind that, debounced, and the
 * header is honest about whether your work is saved.
 *
 * Layout: three columns on a wide screen; on anything narrower the same three
 * panels become tabs, because a 300px rail beside a 300px page is worse than
 * either one at full width.
 */
export function ResumeEditor({
  resumeId,
  initialMeta,
  initialSections,
  profile,
  targetJob,
}: {
  resumeId: string;
  initialMeta: ResumeMeta;
  initialSections: EditorSection[];
  profile: ProjectionProfile | null;
  targetJob: {
    id: string;
    title: string;
    company: string;
    skills: string[];
    requirements: string[];
  } | null;
}) {
  const [meta, setMeta] = React.useState(initialMeta);
  const [sections, setSections] = React.useState(initialSections);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState<number | null>(null);

  const autosave = useAutosave();

  /* ----------------------------------------------------------- mutations */

  const patchMeta = React.useCallback(
    (patch: Partial<ResumeMeta>) => {
      setMeta((current) => {
        const next = { ...current, ...patch };
        autosave.schedule(`meta:${resumeId}`, () =>
          updateResumeMetaAction(resumeId, {
            title: next.title,
            templateKey: next.templateKey,
            accentKey: next.accentKey,
            fontKey: next.fontKey,
            density: next.density,
          }),
        );
        return next;
      });
    },
    [autosave, resumeId],
  );

  const patchSection = React.useCallback(
    (id: string, patch: Partial<Omit<EditorSection, "id">>) => {
      setSections((current) => {
        const next = current.map((section) =>
          section.id === id ? { ...section, ...patch } : section,
        );
        const updated = next.find((section) => section.id === id);
        if (updated) {
          autosave.schedule(`section:${id}`, () =>
            updateResumeSectionAction(id, {
              title: updated.title,
              visible: updated.visible,
              config: updated.config,
            }),
          );
        }
        return next;
      });
    },
    [autosave],
  );

  const moveSection = React.useCallback(
    (id: string, direction: "up" | "down") => {
      setSections((current) => {
        // HEADER is pinned at the top and is not part of the movable run.
        const pinned = current.filter((s) => s.kind === "HEADER");
        const movable = current
          .filter((s) => s.kind !== "HEADER")
          .sort((a, b) => a.sortIndex - b.sortIndex);

        const index = movable.findIndex((section) => section.id === id);
        const target = direction === "up" ? index - 1 : index + 1;
        if (index === -1 || target < 0 || target >= movable.length)
          return current;

        [movable[index], movable[target]] = [movable[target], movable[index]];

        const ordered = [...pinned, ...movable].map((section, position) => ({
          ...section,
          sortIndex: position,
        }));

        // Ordering is saved immediately: it is a deliberate action, and losing
        // it to a navigation would be worse than an extra request.
        autosave.flush(`order:${resumeId}`, () =>
          reorderResumeSectionsAction(
            resumeId,
            ordered.map((section) => section.id),
          ),
        );

        return ordered;
      });
    },
    [autosave, resumeId],
  );

  /* ------------------------------------------------------------- preview */

  const theme = React.useMemo(
    () =>
      resolveTheme({
        accentKey: meta.accentKey,
        fontKey: meta.fontKey,
        density: meta.density,
      }),
    [meta.accentKey, meta.fontKey, meta.density],
  );

  const doc = React.useMemo(
    () => projectDocument(sections, profile),
    [sections, profile],
  );

  const sectionPanel = (
    <SectionPanel
      sections={sections}
      profile={profile}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onToggleVisible={(id, visible) => patchSection(id, { visible })}
      onRenameSection={(id, title) => patchSection(id, { title })}
      onMove={moveSection}
      onConfigChange={(id, config: SectionConfig) =>
        patchSection(id, { config })
      }
    />
  );

  const designPanel = (
    <div className="flex flex-col gap-7">
      <DesignPanel meta={meta} onChange={patchMeta} targetJob={targetJob} />
      {targetJob ? (
        <TailorPanel targetJob={targetJob} profile={profile} />
      ) : null}
    </div>
  );

  const preview = (
    <PreviewPane
      doc={doc}
      theme={theme}
      templateKey={meta.templateKey}
      zoom={zoom}
      onZoom={setZoom}
    />
  );

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col lg:min-h-dvh">
      {/* ------------------------------------------------------- toolbar */}
      <header className="sticky top-14 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule bg-paper/95 px-4 py-2.5 backdrop-blur-md lg:top-0 lg:px-6">
        <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
          <Link href="/resume" aria-label="Back to resumes">
            <ArrowLeft />
          </Link>
        </Button>

        <label className="min-w-0 flex-1">
          <span className="sr-only">Resume name</span>
          <input
            value={meta.title}
            onChange={(event) => patchMeta({ title: event.target.value })}
            className="w-full truncate rounded-sm bg-transparent px-1 py-0.5 text-[0.9375rem] font-medium tracking-[-0.015em] text-ink outline-none transition-colors hover:bg-raised focus:bg-raised"
          />
        </label>

        <SaveIndicator status={autosave.status} error={autosave.error} />

        <Button asChild size="sm" className="shrink-0">
          <a href={`/api/resume/${resumeId}/pdf`} download>
            <Download />
            <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </a>
        </Button>
      </header>

      {/* ------------------------------------------------ wide: 3 columns */}
      <div className="hidden min-h-0 flex-1 xl:grid xl:grid-cols-[19rem_minmax(0,1fr)_17rem]">
        <aside className="h-[calc(100dvh-3.25rem)] overflow-y-auto border-r border-rule p-5">
          {sectionPanel}
        </aside>

        <div className="min-w-0 bg-raised/40">{preview}</div>

        <aside className="h-[calc(100dvh-3.25rem)] overflow-y-auto border-l border-rule p-5">
          {designPanel}
        </aside>
      </div>

      {/* --------------------------------------------- narrow: three tabs */}
      <Tabs
        defaultValue="preview"
        className="flex min-h-0 flex-1 flex-col xl:hidden"
      >
        <TabsList className="shrink-0 gap-6 px-4 lg:px-6">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
        </TabsList>

        <TabsContent
          value="content"
          className="flex-1 overflow-y-auto p-4 lg:p-6"
        >
          {sectionPanel}
        </TabsContent>

        <TabsContent value="preview" className="flex-1 bg-raised/40">
          {preview}
        </TabsContent>

        <TabsContent
          value="design"
          className="flex-1 overflow-y-auto p-4 lg:p-6"
        >
          {designPanel}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------- indicator */

function SaveIndicator({
  status,
  error,
}: {
  status: SaveStatus;
  error: string | null;
}) {
  if (status === "idle") return null;

  if (status === "error") {
    return (
      <span
        role="alert"
        className="flex shrink-0 items-center gap-1.5 text-[0.75rem] text-danger"
        title={error ?? undefined}
      >
        <CircleAlert className="size-3.5" />
        <span className="hidden sm:inline">Not saved</span>
      </span>
    );
  }

  return (
    <span
      role="status"
      className="flex shrink-0 items-center gap-1.5 text-[0.75rem] text-ink-faint"
    >
      {status === "saving" ? (
        <>
          <LoaderCircle className="size-3.5 animate-spin" />
          <span className="hidden sm:inline">Saving…</span>
        </>
      ) : (
        <>
          <Check className="size-3.5 text-success" />
          <span className="hidden sm:inline">Saved</span>
        </>
      )}
    </span>
  );
}

/* --------------------------------------------------------------- preview */

function PreviewPane({
  doc,
  theme,
  templateKey,
  zoom,
  onZoom,
}: {
  doc: ReturnType<typeof projectDocument>;
  theme: ReturnType<typeof resolveTheme>;
  templateKey: string;
  zoom: number | null;
  onZoom: (value: number | null) => void;
}) {
  const empty = doc.sections.length === 0 && !doc.header.name;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rule px-4 py-2">
        <span className="eyebrow">A4 · 210 × 297 mm</span>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onZoom(Math.max(0.3, (zoom ?? 0.65) - 0.1))}
            aria-label="Zoom out"
          >
            <Minus />
          </Button>
          <button
            type="button"
            onClick={() => onZoom(null)}
            className="min-w-12 rounded-sm px-1.5 py-0.5 font-mono text-[0.6875rem] text-ink-muted transition-colors hover:bg-raised"
            title="Fit to width"
          >
            {zoom ? `${Math.round(zoom * 100)}%` : "Fit"}
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onZoom(Math.min(1.5, (zoom ?? 0.65) + 0.1))}
            aria-label="Zoom in"
          >
            <Plus />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-8",
          zoom ? "flex justify-center" : "",
        )}
      >
        {empty ? (
          <div className="mx-auto max-w-sm rounded-md border border-dashed border-rule-strong p-6 text-center">
            <p className="text-[0.9375rem] font-medium text-ink">
              Nothing to lay out yet
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">
              This resume draws from your career profile. Add a role or a
              project and it will appear here.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/profile">Go to your profile</Link>
            </Button>
          </div>
        ) : (
          <div
            className={cn("mx-auto", zoom ? "w-max" : "w-full max-w-[52rem]")}
          >
            <ResumePage
              doc={doc}
              theme={theme}
              templateKey={templateKey}
              scale={zoom ?? undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}
