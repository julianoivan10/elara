"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CalendarClock, GripVertical, MessageSquare } from "lucide-react";

import { cn } from "@/lib/cn";
import { fullDate, relativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { useIsPast } from "@/hooks/use-client-value";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_TONE,
  type BoardApplication,
} from "@/features/applications/types";

/**
 * A card on the board.
 *
 * Draggable for a pointer, but the status is *also* a plain select on every
 * card — dragging is the shortcut, not the only route, so the tracker works
 * with a keyboard, a screen reader and a phone.
 */
export function ApplicationCard({
  application,
  onOpen,
  onStatusChange,
  draggable = true,
  showStatus = false,
}: {
  application: BoardApplication;
  onOpen: () => void;
  onStatusChange: (status: string) => void;
  draggable?: boolean;
  /** The mobile list shows the stage on the card; the board uses columns. */
  showStatus?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
    disabled: !draggable,
  });

  // Resolved after hydration rather than during render: "is this in the past"
  // is not a pure function of the props.
  const overdue = useIsPast(application.nextEventAt);

  return (
    <article
      ref={setNodeRef}
      className={cn(
        "group relative rounded-md border border-rule bg-surface transition-shadow duration-200",
        isDragging ? "opacity-40" : "hover:shadow-(--shadow-paper)",
      )}
    >
      <div className="flex items-start gap-1 p-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpen}
            className="text-left"
            aria-label={`Open ${application.role} at ${application.company}`}
          >
            <span className="absolute inset-0 rounded-md" aria-hidden />
            <h3 className="text-[0.875rem] font-medium leading-tight text-ink">
              {application.company}
            </h3>
            <p className="mt-1 text-[0.8125rem] leading-tight text-ink-muted">
              {application.role}
            </p>
          </button>

          {showStatus ? (
            <Badge tone={STATUS_TONE[application.status]} className="mt-2">
              {STATUS_LABEL[application.status]}
            </Badge>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {application.nextEventAt ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-mono text-[0.625rem] uppercase tracking-[0.1em]",
                  overdue ? "text-coral-ink" : "text-cobalt-ink",
                )}
              >
                <CalendarClock className="size-3" />
                {application.nextEventLabel ?? "Next"} ·{" "}
                {fullDate(application.nextEventAt)}
              </span>
            ) : (
              <span className="eyebrow">
                {application.appliedAt
                  ? `Applied ${relativeTime(application.appliedAt)}`
                  : `Added ${relativeTime(application.updatedAt)}`}
              </span>
            )}

            {application.noteCount > 0 ? (
              <span className="eyebrow inline-flex items-center gap-1">
                <MessageSquare className="size-3" />
                {application.noteCount}
              </span>
            ) : null}
          </div>
        </div>

        {draggable ? (
          <button
            type="button"
            {...listeners}
            {...attributes}
            aria-label={`Drag ${application.role} at ${application.company}`}
            className="relative z-10 -mr-1 -mt-1 hidden size-6 shrink-0 cursor-grab items-center justify-center rounded-sm text-ink-ghost opacity-0 transition-opacity hover:bg-raised hover:text-ink group-focus-within:opacity-100 group-hover:opacity-100 active:cursor-grabbing md:flex"
          >
            <GripVertical className="size-3.5" />
          </button>
        ) : null}
      </div>

      {/* The accessible route for changing stage. */}
      <div className="relative z-10 border-t border-rule px-3 py-1.5">
        <label className="flex items-center gap-2">
          <span className="sr-only">
            Stage for {application.role} at {application.company}
          </span>
          <select
            value={application.status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="min-h-6 w-full cursor-pointer appearance-none bg-transparent py-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-ink-faint outline-none transition-colors hover:text-ink focus-visible:text-ink"
          >
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}
