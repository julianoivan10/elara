"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  FileDown,
  LoaderCircle,
  Plus,
  Wand,
  X,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { draftCoverLetterAction } from "@/server/actions/ai.actions";
import {
  markAppliedAction,
  prepareApplicationAction,
} from "@/server/actions/job.actions";

type Answer = { question: string; answer: string };

const SUGGESTED_QUESTIONS = [
  "Why do you want to work here?",
  "Why this role?",
  "When could you start?",
  "What are your salary expectations?",
];

/**
 * The preparation flow: resume → optional cover letter → optional answers →
 * review → open the official application → mark as applied.
 *
 * Wording is deliberate throughout: "prepared", "open the application",
 * "mark as applied" — never "submitted", because ELARA does not submit.
 */
export function ApplyPrep({
  job,
  resumes,
  initial,
  aiEnabled,
}: {
  job: {
    id: string;
    title: string;
    company: string;
    applyUrl: string;
    applyLabel: string;
    live: boolean;
  };
  resumes: { id: string; title: string; forThisJob: boolean }[];
  initial: {
    applicationId: string | null;
    status: string | null;
    resumeId: string | null;
    coverLetter: string;
    answers: Answer[];
    applied: boolean;
  };
  aiEnabled: boolean;
}) {
  const { toast } = useToast();
  const [resumeId, setResumeId] = React.useState(initial.resumeId);
  const [coverLetter, setCoverLetter] = React.useState(initial.coverLetter);
  const [answers, setAnswers] = React.useState<Answer[]>(initial.answers);
  const [applicationId, setApplicationId] = React.useState(
    initial.applicationId,
  );
  const [prepared, setPrepared] = React.useState(
    initial.status === "PREPARED" || initial.applied,
  );
  const [opened, setOpened] = React.useState(false);
  const [applied, setApplied] = React.useState(initial.applied);
  const [saving, startSave] = React.useTransition();
  const [marking, startMark] = React.useTransition();
  const [drafting, setDrafting] = React.useState(false);
  const [draftNotes, setDraftNotes] = React.useState<string[]>([]);
  const [dirty, setDirty] = React.useState(false);

  const change =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setDirty(true);
    };

  const save = () =>
    startSave(async () => {
      const result = await prepareApplicationAction({
        jobId: job.id,
        resumeId,
        coverLetter: coverLetter || null,
        answers,
      });
      toast(result.message ?? "Saved.", {
        tone: result.status === "error" ? "error" : "success",
      });
      if (result.status !== "error") {
        setPrepared(true);
        setDirty(false);
        if (result.applicationId) setApplicationId(result.applicationId);
      }
    });

  const draft = async () => {
    setDrafting(true);
    setDraftNotes([]);
    const result = await draftCoverLetterAction(job.id);
    setDrafting(false);
    if (result.status === "error") {
      toast(result.message, { tone: "error" });
      return;
    }
    if (result.data.letter) {
      change(setCoverLetter)(result.data.letter);
    }
    setDraftNotes([
      ...(result.data.filtered
        ? [
            "A draft was discarded because it stated a figure your profile does not contain.",
          ]
        : []),
      ...result.data.notes,
    ]);
  };

  const markApplied = () =>
    startMark(async () => {
      if (!applicationId) return;
      const result = await markAppliedAction(applicationId);
      toast(result.message ?? "Done.", {
        tone: result.status === "error" ? "error" : "success",
      });
      if (result.status !== "error") setApplied(true);
    });

  const selectedResume = resumes.find((r) => r.id === resumeId) ?? null;

  if (!job.live) {
    return (
      <p className="rounded-md border border-warning/25 bg-warning-tint px-4 py-3 text-[0.875rem] text-warning">
        This listing is no longer open, so there is nothing to apply to.{" "}
        <Link href="/jobs" className="underline underline-offset-4">
          Find live openings
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {/* ------------------------------------------------------ resume */}
      <Step
        index="01"
        title="Resume"
        hint="The resume you will attach on the official form."
      >
        {resumes.length === 0 ? (
          <p className="text-[0.875rem] leading-relaxed text-ink-muted">
            You have no resumes yet.{" "}
            <Link
              href={`/jobs/${job.id}`}
              className="text-cobalt-ink underline decoration-cobalt-soft underline-offset-4"
            >
              Create one tailored to this job
            </Link>{" "}
            from the posting.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {resumes.map((resume) => (
              <label
                key={resume.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-sm border px-3 py-2.5 text-[0.875rem] transition-colors",
                  resumeId === resume.id
                    ? "border-ink bg-raised/60 text-ink"
                    : "border-rule text-ink-muted hover:border-rule-strong",
                )}
              >
                <input
                  type="radio"
                  name="resume"
                  checked={resumeId === resume.id}
                  onChange={() => change(setResumeId)(resume.id)}
                  className="accent-[var(--color-ink)]"
                />
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  {resume.title}
                </span>
                {resume.forThisJob ? (
                  <span className="eyebrow shrink-0 text-[#4b6106]">
                    For this job
                  </span>
                ) : null}
              </label>
            ))}
            {selectedResume ? (
              <div className="mt-1 flex flex-wrap gap-3">
                <Link
                  href={`/resume/${selectedResume.id}`}
                  className="text-[0.8125rem] text-cobalt-ink underline decoration-cobalt-soft underline-offset-4"
                >
                  Review in the editor
                </Link>
                <a
                  href={`/api/resume/${selectedResume.id}/pdf`}
                  download
                  className="inline-flex items-center gap-1 text-[0.8125rem] text-cobalt-ink underline decoration-cobalt-soft underline-offset-4"
                >
                  <FileDown className="size-3.5" />
                  Download PDF
                </a>
              </div>
            ) : null}
          </div>
        )}
      </Step>

      {/* ------------------------------------------------ cover letter */}
      <Step
        index="02"
        title="Cover letter"
        hint="Optional. Many forms ask for one; write it here, paste it there."
      >
        <Field>
          <Textarea
            value={coverLetter}
            onChange={(event) => change(setCoverLetter)(event.target.value)}
            rows={10}
            placeholder={`Dear ${job.company} team, …`}
            aria-label="Cover letter"
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          {aiEnabled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={draft}
              disabled={drafting}
            >
              {drafting ? <LoaderCircle className="animate-spin" /> : <Wand />}
              {drafting
                ? "Drafting…"
                : coverLetter
                  ? "Draft again"
                  : "Draft from my profile"}
            </Button>
          ) : null}
          {coverLetter ? (
            <CopyButton text={coverLetter} label="Copy letter" />
          ) : null}
        </div>
        {draftNotes.length ? (
          <ul className="flex flex-col gap-1 text-[0.75rem] leading-relaxed text-ink-faint">
            {draftNotes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        ) : null}
        {aiEnabled ? (
          <p className="text-[0.75rem] leading-relaxed text-ink-faint">
            A draft uses only what is on your profile. Read it and make it yours
            before you send it.
          </p>
        ) : null}
      </Step>

      {/* ----------------------------------------------------- answers */}
      <Step
        index="03"
        title="Answers"
        hint="Optional. Prepare answers to questions the form is likely to ask."
      >
        <div className="flex flex-col gap-4">
          {answers.map((a, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-md border border-rule p-3"
            >
              <div className="flex items-start gap-2">
                <input
                  value={a.question}
                  onChange={(event) =>
                    change(setAnswers)(
                      answers.map((x, j) =>
                        j === i ? { ...x, question: event.target.value } : x,
                      ),
                    )
                  }
                  aria-label={`Question ${i + 1}`}
                  className="min-w-0 flex-1 border-0 border-b border-rule bg-transparent pb-1 text-[0.875rem] font-medium text-ink outline-none focus:border-cobalt"
                />
                <button
                  type="button"
                  onClick={() =>
                    change(setAnswers)(answers.filter((_, j) => j !== i))
                  }
                  aria-label={`Remove question ${i + 1}`}
                  className="flex size-7 shrink-0 items-center justify-center rounded-sm text-ink-ghost hover:bg-raised hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <Field>
                <Textarea
                  value={a.answer}
                  rows={3}
                  onChange={(event) =>
                    change(setAnswers)(
                      answers.map((x, j) =>
                        j === i ? { ...x, answer: event.target.value } : x,
                      ),
                    )
                  }
                  aria-label={`Answer ${i + 1}`}
                  placeholder="Your answer"
                />
              </Field>
              {a.answer ? (
                <CopyButton text={a.answer} label="Copy answer" />
              ) : null}
            </div>
          ))}
        </div>
        {answers.length < 12 ? (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.filter(
              (q) => !answers.some((a) => a.question === q),
            ).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() =>
                  change(setAnswers)([...answers, { question: q, answer: "" }])
                }
                className="inline-flex items-center gap-1 rounded-xs border border-dashed border-rule-strong px-2 py-1 text-[0.75rem] text-ink-muted hover:border-ink hover:text-ink"
              >
                <Plus className="size-3" />
                {q}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                change(setAnswers)([
                  ...answers,
                  { question: "Another question", answer: "" },
                ])
              }
              className="inline-flex items-center gap-1 rounded-xs border border-dashed border-rule-strong px-2 py-1 text-[0.75rem] text-ink-muted hover:border-ink hover:text-ink"
            >
              <Plus className="size-3" />
              Your own question
            </button>
          </div>
        ) : null}
      </Step>

      {/* ------------------------------------------------------ review */}
      <Step
        index="04"
        title="Review and apply"
        hint="Save what you prepared, then apply on the official page."
      >
        <ul className="flex flex-col gap-1.5 text-[0.875rem]">
          <ReviewRow
            done={Boolean(selectedResume)}
            label={
              selectedResume
                ? `Resume: ${selectedResume.title}`
                : "No resume chosen"
            }
          />
          <ReviewRow
            done={coverLetter.trim().length > 0}
            label={
              coverLetter.trim()
                ? "Cover letter ready"
                : "No cover letter (optional)"
            }
          />
          <ReviewRow
            done={answers.some((a) => a.answer.trim())}
            label={`${answers.filter((a) => a.answer.trim()).length} answer${answers.filter((a) => a.answer.trim()).length === 1 ? "" : "s"} ready`}
          />
        </ul>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button onClick={save} disabled={saving || (prepared && !dirty)}>
            {saving
              ? "Saving…"
              : prepared && !dirty
                ? "Application prepared"
                : prepared
                  ? "Save changes"
                  : "Save as prepared"}
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-auto min-h-10 whitespace-normal py-2 text-center"
          >
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpened(true)}
            >
              {job.applyLabel}
              <ExternalLink />
            </a>
          </Button>
        </div>

        {applied ? (
          <p className="flex items-start gap-2 text-[0.875rem] text-success">
            <Check className="mt-0.5 size-4 shrink-0" />
            <span>
              Marked as applied. Follow it on your{" "}
              <Link
                href="/applications"
                className="underline underline-offset-4"
              >
                tracker
              </Link>
              .
            </span>
          </p>
        ) : applicationId && (opened || prepared) ? (
          <div className="flex flex-col gap-2 rounded-md border border-rule bg-raised/40 p-4">
            <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
              Applied on the official page? Mark it here so your tracker has the
              date and the resume you used.
            </p>
            <Button
              variant="subtle"
              size="sm"
              className="self-start"
              onClick={markApplied}
              disabled={marking}
            >
              {marking ? "Saving…" : "Mark as applied"}
            </Button>
          </div>
        ) : !applicationId ? (
          <p className="text-[0.75rem] text-ink-faint">
            Save first, so there is an application to mark as applied later.
          </p>
        ) : null}

        <p className="text-[0.75rem] leading-relaxed text-ink-faint">
          ELARA does not send anything to {job.company}. Your application is
          complete only once you submit it on the official page.
        </p>
      </Step>
    </div>
  );
}

function Step({
  index,
  title,
  hint,
  children,
}: {
  index: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline gap-4 border-b border-ink pb-3">
        <span
          data-numeric
          className="font-mono text-[0.6875rem] tracking-[0.1em] text-ink-ghost"
        >
          {index}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-[1.0625rem] tracking-[-0.02em] text-ink">
            {title}
          </h2>
          <p className="text-[0.8125rem] text-ink-muted">{hint}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function ReviewRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-2",
        done ? "text-ink" : "text-ink-faint",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-4 items-center justify-center rounded-full border",
          done ? "border-ink bg-ink text-paper" : "border-rule-strong",
        )}
      >
        {done ? <Check className="size-2.5" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
    </li>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1 self-start text-[0.75rem] text-ink-muted hover:text-ink"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : label}
    </button>
  );
}
