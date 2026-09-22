"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { removeClosedSavedJobsAction } from "@/server/actions/job.actions";

/** Clear every saved job whose listing has closed. */
export function RemoveClosedButton() {
  const { toast } = useToast();
  const [pending, start] = React.useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await removeClosedSavedJobsAction();
          toast(result.message ?? "Done.", {
            tone: result.status === "error" ? "error" : "success",
          });
        })
      }
    >
      {pending ? "Removing…" : "Remove closed listings"}
    </Button>
  );
}
