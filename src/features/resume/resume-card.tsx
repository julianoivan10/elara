"use client";

import * as React from "react";
import Link from "next/link";
import { Copy, Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { relativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { resolveTheme, type ResumeDocument } from "@/features/resume/document";
import { getTemplate } from "@/features/resume/templates";
import { ResumePage } from "@/features/resume/resume-page";
import { DeleteEntryButton } from "@/features/profile/entry-dialog";
import {
  deleteResumeAction,
  duplicateResumeAction,
} from "@/server/actions/resume.actions";

export type ResumeCardData = {
  id: string;
  title: string;
  templateKey: string;
  accentKey: string;
  fontKey: string;
  density: string;
  updatedAt: Date;
  targetJob: { id: string; title: string; company: string } | null;
  doc: ResumeDocument;
};

/**
 * A resume in the gallery, shown as the page itself rather than as an icon and
 * a filename. The thumbnail is the real template rendered small, so the list is
 * scannable by how each resume actually looks.
 */
export function ResumeCard({ resume }: { resume: ResumeCardData }) {
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();

  const theme = React.useMemo(
    () =>
      resolveTheme({
        accentKey: resume.accentKey,
        fontKey: resume.fontKey,
        density: resume.density,
      }),
    [resume.accentKey, resume.fontKey, resume.density],
  );

  const duplicate = () =>
    startTransition(async () => {
      const result = await duplicateResumeAction(resume.id);
      // A successful duplicate redirects, so anything returned is a failure.
      if (result?.status === "error") {
        toast(result.message ?? "Could not duplicate.", { tone: "error" });
      }
    });

  return (
    <article className="group flex flex-col">
      <Link
        href={`/resume/${resume.id}`}
        className="relative block overflow-hidden rounded-md border border-rule bg-raised/50 p-4 transition-colors duration-200 hover:border-ink-ghost"
        aria-label={`Open ${resume.title}`}
      >
        {/* The sheet is clipped to a card-height window: this is a thumbnail,
            not a scroller. */}
        <div className="pointer-events-none h-52 overflow-hidden rounded-[2px] sm:h-60">
          <ResumePage
            doc={resume.doc}
            theme={theme}
            templateKey={resume.templateKey}
            showPageBreaks={false}
          />
        </div>

        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-raised/90 to-transparent"
        />
      </Link>

      <div className="flex items-start justify-between gap-3 pt-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[0.9375rem] font-medium text-ink">
            <Link
              href={`/resume/${resume.id}`}
              className="hover:underline underline-offset-4"
            >
              {resume.title}
            </Link>
          </h3>

          <p className="eyebrow mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{getTemplate(resume.templateKey).name}</span>
            <span aria-hidden className="text-ink-ghost">
              ·
            </span>
            <span>Edited {relativeTime(resume.updatedAt)}</span>
          </p>

          {resume.targetJob ? (
            <Badge tone="cobalt" className="mt-2">
              Aimed at {resume.targetJob.company}
            </Badge>
          ) : null}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Actions for ${resume.title}`}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href={`/resume/${resume.id}`}>
                <Pencil />
                Open editor
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <a href={`/api/resume/${resume.id}/pdf`} download>
                <Download />
                Download PDF
              </a>
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={duplicate} disabled={pending}>
              <Copy />
              Duplicate
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DeleteEntryButton
              name={resume.title}
              onConfirm={() => deleteResumeAction(resume.id)}
              trigger={
                <DropdownMenuItem
                  tone="danger"
                  onSelect={(event) => event.preventDefault()}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
