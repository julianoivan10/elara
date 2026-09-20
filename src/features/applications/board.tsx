"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { setApplicationStatusAction } from "@/server/actions/application.actions";
import { ApplicationCard } from "@/features/applications/application-card";
import { ApplicationDialog } from "@/features/applications/application-dialog";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_TONE,
  type BoardApplication,
} from "@/features/applications/types";

/**
 * The tracker.
 *
 * On a wide screen it is a board of seven columns. On a phone it becomes a
 * single ordered list grouped by stage — a horizontal kanban on a 390px screen
 * is a worse way to read your own job search, so the mobile view is written
 * rather than squeezed.
 *
 * Status changes are optimistic and recorded server-side as events, so the
 * history on each card is real.
 */
export function ApplicationsBoard({
  applications,
}: {
  applications: BoardApplication[];
}) {
  const [items, setItems] = React.useState(applications);
  const [serverItems, setServerItems] = React.useState(applications);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const { toast } = useToast();

  // Adjusting state during render when the prop changes: the board holds
  // optimistic positions, and a revalidated server list replaces them.
  if (serverItems !== applications) {
    setServerItems(applications);
    setItems(applications);
  }

  const sensors = useSensors(
    // A small distance threshold so a click on the card still opens it.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const move = React.useCallback(
    (id: string, status: string) => {
      const previous = items;
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, status: status as BoardApplication["status"] }
            : item,
        ),
      );

      void setApplicationStatusAction(id, status).then((result) => {
        if (result.status === "error") {
          setItems(previous);
          toast(result.message ?? "Could not move that.", { tone: "error" });
        }
      });
    },
    [items, toast],
  );

  const onDragEnd = (event: DragEndEvent) => {
    setDragging(null);
    const status = event.over?.id;
    const id = String(event.active.id);
    if (!status) return;

    const current = items.find((item) => item.id === id);
    if (!current || current.status === status) return;

    move(id, String(status));
  };

  const active = items.find((item) => item.id === dragging) ?? null;
  const open = items.find((item) => item.id === openId) ?? null;

  const byStatus = (status: string) =>
    items.filter((item) => item.status === status);

  return (
    <>
      {/* -------------------------------------------------- wide: board */}
      <DndContext
        sensors={sensors}
        onDragStart={(event: DragStartEvent) =>
          setDragging(String(event.active.id))
        }
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="scrollbar-none -mx-4 hidden gap-3 overflow-x-auto px-4 pb-4 md:flex md:-mx-8 md:px-8">
          {STATUS_ORDER.map((status) => (
            <Column
              key={status}
              status={status}
              items={byStatus(status)}
              onOpen={setOpenId}
              onStatusChange={move}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {active ? (
            <div className="w-64 rotate-1 cursor-grabbing">
              <ApplicationCard
                application={active}
                onOpen={() => undefined}
                onStatusChange={() => undefined}
                draggable={false}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ------------------------------------------------ narrow: list */}
      <div className="flex flex-col gap-8 md:hidden">
        {STATUS_ORDER.map((status) => {
          const group = byStatus(status);
          if (group.length === 0) return null;

          return (
            <section key={status} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 border-b border-rule pb-2">
                <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                <span
                  data-numeric
                  className="font-mono text-[0.6875rem] text-ink-ghost"
                >
                  {group.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {group.map((item) => (
                  <ApplicationCard
                    key={item.id}
                    application={item}
                    draggable={false}
                    onOpen={() => setOpenId(item.id)}
                    onStatusChange={(next) => move(item.id, next)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <ApplicationDialog
        application={open}
        onClose={() => setOpenId(null)}
        onStatusChange={move}
      />
    </>
  );
}

function Column({
  status,
  items,
  onOpen,
  onStatusChange,
}: {
  status: string;
  items: BoardApplication[];
  onOpen: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABEL[status as BoardApplication["status"]]}, ${items.length} application${items.length === 1 ? "" : "s"}`}
      className={cn(
        "flex w-[15.5rem] shrink-0 flex-col rounded-md transition-colors duration-200",
        isOver ? "bg-cobalt-tint" : "bg-transparent",
      )}
    >
      <header className="flex items-center justify-between gap-2 px-1 pb-2.5">
        <Badge tone={STATUS_TONE[status as BoardApplication["status"]]}>
          {STATUS_LABEL[status as BoardApplication["status"]]}
        </Badge>
        <span
          data-numeric
          className="font-mono text-[0.6875rem] text-ink-ghost"
        >
          {items.length}
        </span>
      </header>

      <div
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2 rounded-md border-t border-rule px-1 pt-2.5",
          isOver && "border-cobalt",
        )}
      >
        {items.length === 0 ? (
          <p className="px-1 py-3 text-[0.75rem] leading-snug text-ink-ghost">
            Nothing here.
          </p>
        ) : (
          items.map((item) => (
            <ApplicationCard
              key={item.id}
              application={item}
              onOpen={() => onOpen(item.id)}
              onStatusChange={(next) => onStatusChange(item.id, next)}
            />
          ))
        )}
      </div>
    </section>
  );
}
