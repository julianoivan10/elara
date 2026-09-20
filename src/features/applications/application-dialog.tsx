"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";

import { humanizeEnum, relativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { Field, FieldLabel, Input, Textarea } from "@/components/ui/field";
import { Eyebrow } from "@/components/ui/editorial";
import { FormMessage, SubmitButton, fieldError } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { idle, type ActionState } from "@/server/actions/result";
import {
  addApplicationNoteAction,
  deleteApplicationAction,
  deleteApplicationNoteAction,
  loadApplicationDetailAction,
  updateApplicationAction,
} from "@/server/actions/application.actions";
import { DeleteEntryButton } from "@/features/profile/entry-dialog";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  STATUS_TONE,
  type BoardApplication,
} from "@/features/applications/types";

type Detail = Awaited<ReturnType<typeof loadApplicationDetailAction>>;

/**
 * One application in full: its details, the notes you have kept, and the
 * history of how it moved. History is why status changes are stored as events —
 * "when did this go to interview?" is a question people actually ask.
 */
export function ApplicationDialog({
  application,
  onClose,
  onStatusChange,
}: {
  application: BoardApplication | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  if (!application) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg">
        <DialogHeader
          label={application.company}
          title={application.role}
          description={
            [application.location, application.source]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        />

        <DialogBody className="flex flex-col gap-6">
          {/* ------------------------------------------------- stage */}
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_ORDER.map((status) => {
              const active = status === application.status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusChange(application.id, status)}
                  aria-pressed={active}
                  className="rounded-xs outline-none focus-visible:outline-2"
                >
                  <Badge
                    tone={active ? STATUS_TONE[status] : "outline"}
                    className={
                      active
                        ? ""
                        : "opacity-70 transition-opacity hover:opacity-100"
                    }
                  >
                    {STATUS_LABEL[status]}
                  </Badge>
                </button>
              );
            })}
          </div>

          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">
                Notes
                {application.noteCount > 0 ? (
                  <span data-numeric className="ml-1.5 text-ink-ghost">
                    {application.noteCount}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* --------------------------------------------- notes */}
            <TabsContent value="notes" className="pt-5">
              <NoteForm applicationId={application.id} />
              <NotesList key={application.id} applicationId={application.id} />
            </TabsContent>

            {/* ------------------------------------------- details */}
            <TabsContent value="details" className="pt-5">
              <DetailsForm application={application} />
            </TabsContent>

            {/* ------------------------------------------- history */}
            <TabsContent value="history" className="pt-5">
              <History key={application.id} applicationId={application.id} />
            </TabsContent>
          </Tabs>

          {/* ------------------------------------------------- links */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
            <div className="flex flex-wrap gap-3">
              {application.url ? (
                <a
                  href={application.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[0.8125rem] text-cobalt-ink underline decoration-cobalt-soft underline-offset-4"
                >
                  The posting
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
              {application.job ? (
                <Link
                  href={`/jobs/${application.job.id}`}
                  className="text-[0.8125rem] text-cobalt-ink underline decoration-cobalt-soft underline-offset-4"
                >
                  Open in ELARA
                </Link>
              ) : null}
            </div>

            <DeleteEntryButton
              name={`${application.role} at ${application.company}`}
              onConfirm={async () => {
                const result = await deleteApplicationAction(application.id);
                if (result.status !== "error") onClose();
                return result;
              }}
              trigger={
                <Button variant="ghost" size="sm" className="text-danger">
                  <Trash2 />
                  Remove
                </Button>
              }
            />
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ notes */

function NoteForm({ applicationId }: { applicationId: string }) {
  const action = React.useMemo(
    () => addApplicationNoteAction.bind(null, applicationId),
    [applicationId],
  );
  const [state, formAction] = React.useActionState(action, idle);
  const formRef = React.useRef<HTMLFormElement>(null);
  const handled = React.useRef<ActionState | null>(null);

  React.useEffect(() => {
    if (state.status === "ok" && handled.current !== state) {
      handled.current = state;
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <Field error={fieldError(state, "body")}>
        <FieldLabel>Add a note</FieldLabel>
        <Textarea
          name="body"
          rows={3}
          placeholder="Spoke to Sofie. They want to see something I have owned end to end."
        />
      </Field>
      <SubmitButton size="sm" variant="outline" className="self-start">
        Save note
      </SubmitButton>
    </form>
  );
}

function NoteRow({
  note,
  onDeleted,
}: {
  note: { id: string; body: string; createdAt: Date };
  onDeleted: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const { toast } = useToast();

  const remove = () =>
    startTransition(async () => {
      const result = await deleteApplicationNoteAction(note.id);
      if (result.status === "error") {
        toast(result.message ?? "Could not delete that.", { tone: "error" });
      } else {
        onDeleted();
      }
    });

  return (
    <div className="group flex items-start gap-3 border-b border-rule py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap text-[0.8125rem] leading-relaxed text-ink">
          {note.body}
        </p>
        <time
          dateTime={new Date(note.createdAt).toISOString()}
          className="eyebrow mt-1.5 block"
        >
          {relativeTime(note.createdAt)}
        </time>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={remove}
        disabled={pending}
        aria-label="Delete note"
        className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        <Trash2 />
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------------- details */

function toLocalInput(date: Date | null) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DetailsForm({ application }: { application: BoardApplication }) {
  const action = React.useMemo(
    () => updateApplicationAction.bind(null, application.id),
    [application.id],
  );
  const [state, formAction] = React.useActionState(action, idle);
  const { toast } = useToast();
  const handled = React.useRef<ActionState | null>(null);

  React.useEffect(() => {
    if (state.status === "ok" && handled.current !== state) {
      handled.current = state;
      toast(state.message ?? "Saved.");
    }
  }, [state, toast]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <FormMessage state={state} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={fieldError(state, "company")}>
          <FieldLabel>Company</FieldLabel>
          <Input name="company" defaultValue={application.company} required />
        </Field>
        <Field error={fieldError(state, "role")}>
          <FieldLabel>Role</FieldLabel>
          <Input name="role" defaultValue={application.role} required />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field error={fieldError(state, "location")}>
          <FieldLabel optional>Location</FieldLabel>
          <Input name="location" defaultValue={application.location ?? ""} />
        </Field>
        <Field error={fieldError(state, "source")}>
          <FieldLabel optional>Found via</FieldLabel>
          <Input
            name="source"
            defaultValue={application.source ?? ""}
            placeholder="ELARA, referral, company site"
          />
        </Field>
      </div>

      <Field error={fieldError(state, "url")}>
        <FieldLabel optional>Link to the posting</FieldLabel>
        <Input name="url" type="url" defaultValue={application.url ?? ""} />
      </Field>

      <fieldset className="grid gap-5 border-t border-rule pt-5 sm:grid-cols-2">
        <legend className="sr-only">What happens next</legend>
        <Field error={fieldError(state, "nextEventLabel")}>
          <FieldLabel optional>What happens next</FieldLabel>
          <Input
            name="nextEventLabel"
            defaultValue={application.nextEventLabel ?? ""}
            placeholder="Technical call"
          />
        </Field>
        <Field error={fieldError(state, "nextEventAt")}>
          <FieldLabel optional>When</FieldLabel>
          <Input
            name="nextEventAt"
            type="datetime-local"
            defaultValue={toLocalInput(application.nextEventAt)}
          />
        </Field>
      </fieldset>

      <div className="flex items-center justify-between gap-4">
        <Eyebrow>Updated {relativeTime(application.updatedAt)}</Eyebrow>
        <SubmitButton size="sm">Save changes</SubmitButton>
      </div>
    </form>
  );
}

/* ------------------------------------------------------- notes & history */

/**
 * Loaded per application rather than shipped with every card on the board.
 * Keyed by id, so switching card remounts instead of resetting state.
 */
function NotesList({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [notes, setNotes] = React.useState<Detail["notes"]>([]);

  React.useEffect(() => {
    let cancelled = false;

    void loadApplicationDetailAction(applicationId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      setNotes(result.notes);
    });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  return (
    <div className="mt-5 flex flex-col">
      {loading ? (
        <p className="text-[0.8125rem] text-ink-faint">Loading…</p>
      ) : notes.length > 0 ? (
        notes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            onDeleted={() =>
              setNotes((current) => current.filter((n) => n.id !== note.id))
            }
          />
        ))
      ) : (
        <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
          Nothing noted yet. Who you spoke to, what they asked, what you
          promised to send — it is all easier to have written down two weeks
          later.
        </p>
      )}
    </div>
  );
}

function History({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [events, setEvents] = React.useState<Detail["events"]>([]);

  React.useEffect(() => {
    let cancelled = false;

    void loadApplicationDetailAction(applicationId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      setEvents(result.events);
    });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (loading) {
    return <p className="text-[0.8125rem] text-ink-faint">Loading…</p>;
  }

  if (events.length === 0) {
    return <p className="text-[0.8125rem] text-ink-muted">No history yet.</p>;
  }

  return (
    <ol className="relative flex flex-col gap-4 pl-4">
      <span aria-hidden className="absolute inset-y-1 left-0 w-px bg-rule" />
      {events.map((event) => (
        <li
          key={event.id}
          className="relative flex items-baseline justify-between gap-4"
        >
          <span
            aria-hidden
            className="absolute -left-4 top-1.5 size-1.5 rounded-full bg-rule-strong ring-4 ring-surface"
          />
          <span className="text-[0.8125rem] text-ink-muted">
            {event.fromStatus ? (
              <>
                {humanizeEnum(event.fromStatus)}
                {" → "}
              </>
            ) : (
              "Added as "
            )}
            <span className="font-medium text-ink">
              {humanizeEnum(event.toStatus)}
            </span>
          </span>
          <time
            dateTime={new Date(event.createdAt).toISOString()}
            className="shrink-0 font-mono text-[0.6875rem] text-ink-faint"
          >
            {relativeTime(event.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}
