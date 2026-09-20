"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/features/workspace/page-header";

/**
 * The workspace error boundary.
 *
 * It says what happened without pretending to know why, offers the two things
 * that actually help, and never prints the underlying error — which can carry
 * database detail. The digest is shown so a report can be matched to a log line.
 */
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[workspace]", error);
  }, [error]);

  return (
    <PageShell className="max-w-2xl">
      <div className="flex flex-col gap-5 py-16">
        <span className="eyebrow">Something went wrong</span>

        <h1 className="text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] leading-[1.1] tracking-[-0.03em] text-ink">
          That page did not load.
        </h1>

        <p className="max-w-[56ch] text-[0.9375rem] leading-relaxed text-ink-muted">
          Nothing you had saved is affected. Try again, and if it keeps
          happening go back to your dashboard and carry on from there.
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={reset}>
            <RotateCcw />
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to your dashboard</Link>
          </Button>
        </div>

        {error.digest ? (
          <p className="border-t border-rule pt-5 font-mono text-[0.6875rem] text-ink-ghost">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </PageShell>
  );
}
