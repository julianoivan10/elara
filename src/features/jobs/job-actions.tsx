"use client";

import * as React from "react";
import { ClipboardList, ExternalLink, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { trackJobAction } from "@/server/actions/job.actions";
import { createTailoredResumeAction } from "@/server/actions/resume.actions";

/**
 * The two things worth doing from a posting: aim a resume at it, and start
 * tracking it. "Create a tailored resume" is the link between discovery and the
 * editor that the whole product is built around, so it leads.
 */
export function JobActions({
  jobId,
  applyUrl,
  alreadyTracked,
}: {
  jobId: string;
  applyUrl: string;
  alreadyTracked: boolean;
}) {
  const { toast } = useToast();
  const [tailoring, startTailor] = React.useTransition();
  const [tracking, startTrack] = React.useTransition();

  const tailor = () =>
    startTailor(async () => {
      // On success this redirects into the new resume, so anything returned
      // here is a failure.
      const result = await createTailoredResumeAction(jobId);
      if (result?.status === "error") {
        toast(result.message ?? "Could not create that resume.", {
          tone: "error",
        });
      }
    });

  const track = () =>
    startTrack(async () => {
      const result = await trackJobAction(jobId);
      toast(result.message ?? "Added.", {
        tone: result.status === "error" ? "error" : "success",
      });
    });

  return (
    // Buttons carry whitespace-nowrap, so wherever the column is narrow they
    // cannot shrink and push past it. Stacked on a phone, inline while the
    // page is a single wide column, stacked again from lg where this moves
    // into the narrow sticky aside.
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-col">
      <Button onClick={tailor} disabled={tailoring} className="w-full sm:w-auto lg:w-full">
        <FileText />
        {tailoring ? "Preparing…" : "Create a tailored resume"}
      </Button>

      <Button
        variant="outline"
        onClick={track}
        disabled={tracking || alreadyTracked}
      >
        <ClipboardList />
        {alreadyTracked ? "On your board" : tracking ? "Adding…" : "Track it"}
      </Button>

      <Button asChild variant="ghost" className="w-full sm:w-auto lg:w-full">
        <a href={applyUrl} target="_blank" rel="noopener noreferrer">
          Apply on the company site
          <ExternalLink />
        </a>
      </Button>
    </div>
  );
}
