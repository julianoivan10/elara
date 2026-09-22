"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, ExternalLink, FileText, Send } from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { trackJobAction } from "@/server/actions/job.actions";
import { createTailoredResumeAction } from "@/server/actions/resume.actions";

/**
 * What can be done from a posting.
 *
 * "Prepare application" leads: resume, cover letter and answers get ready in
 * ELARA, then the person applies on the official page. ELARA never submits on
 * their behalf unless a provider's authorised API does it — none do yet — so
 * the apply button always names where it goes.
 */
export function JobActions({
  jobId,
  applyUrl,
  applyLabel,
  live,
  resumes,
  tracked,
}: {
  jobId: string;
  applyUrl: string;
  /** From applicationChannelFor: says exactly where the button goes. */
  applyLabel: string;
  live: boolean;
  resumes: { id: string; title: string }[];
  tracked: boolean;
}) {
  const { toast } = useToast();
  const [tracking, startTrack] = React.useTransition();

  const track = () =>
    startTrack(async () => {
      const result = await trackJobAction(jobId);
      toast(result.message ?? "Added.", {
        tone: result.status === "error" ? "error" : "success",
      });
    });

  return (
    // Buttons carry whitespace-nowrap, so wherever the column is narrow they
    // cannot shrink and push past it: stacked on a phone and in the narrow
    // aside, inline while the page is a single wide column.
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-col">
      {live ? (
        <>
          <Button asChild className="w-full sm:w-auto lg:w-full">
            <Link href={`/jobs/${jobId}/apply`}>
              <Send />
              Prepare application
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto lg:w-full"
          >
            <a href={applyUrl} target="_blank" rel="noopener noreferrer">
              {applyLabel}
              <ExternalLink />
            </a>
          </Button>
        </>
      ) : null}

      <TailorButton jobId={jobId} resumes={resumes} />

      <Button
        variant="ghost"
        onClick={track}
        disabled={tracking || tracked}
        className="w-full sm:w-auto lg:w-full"
      >
        <ClipboardList />
        {tracked ? "On your tracker" : tracking ? "Adding…" : "Track it"}
      </Button>
    </div>
  );
}

/** Choose what the tailored resume starts from: the profile, or a resume. */
function TailorButton({
  jobId,
  resumes,
}: {
  jobId: string;
  resumes: { id: string; title: string }[];
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [base, setBase] = React.useState<string>("");
  const [pending, start] = React.useTransition();

  const create = () =>
    start(async () => {
      // On success this redirects into the new resume, so anything returned
      // here is a failure.
      const result = await createTailoredResumeAction(jobId, base || null);
      if (result?.status === "error") {
        toast(result.message ?? "Could not create that resume.", {
          tone: "error",
        });
      }
    });

  const options = [
    { id: "", title: "A fresh resume from my profile" },
    ...resumes,
  ];

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto lg:w-full"
      >
        <FileText />
        Create a tailored resume
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader
            label="Tailored resume"
            title="Start from"
            description="The new resume is aimed at this job. In the editor, the assistant suggests what to lead with — from your own profile only."
          />
          <DialogBody className="flex flex-col gap-2">
            {options.map((option) => (
              <label
                key={option.id || "fresh"}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-sm border px-3 py-2.5 text-[0.875rem] transition-colors",
                  base === option.id
                    ? "border-ink bg-raised/60 text-ink"
                    : "border-rule text-ink-muted hover:border-rule-strong",
                )}
              >
                <input
                  type="radio"
                  name="base"
                  value={option.id}
                  checked={base === option.id}
                  onChange={() => setBase(option.id)}
                  className="accent-[var(--color-ink)]"
                />
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {option.title}
                </span>
              </label>
            ))}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={pending}>
              {pending ? "Preparing…" : "Create resume"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
