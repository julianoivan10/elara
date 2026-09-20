"use client";

import * as React from "react";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { resendVerificationAction } from "@/server/actions/auth.actions";

/**
 * Unverified accounts are nudged, not locked out.
 *
 * Blocking the workspace behind a confirmation click is the fastest way to lose
 * someone who mistyped their address — they can still build a profile, and the
 * reminder stays until it is done.
 */
export function VerifyEmailBanner({
  verified,
  email,
}: {
  verified: boolean;
  email: string;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  const [dismissed, setDismissed] = React.useState(false);

  if (verified || dismissed) return null;

  const resend = () =>
    startTransition(async () => {
      const result = await resendVerificationAction();
      toast(result.message ?? "Sent.", {
        tone: result.status === "error" ? "error" : "success",
      });
    });

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-warning/20 bg-warning-tint px-4 py-2.5 md:px-8">
      <MailCheck className="size-4 shrink-0 text-warning" />
      <p className="flex-1 text-[0.8125rem] text-warning">
        Confirm <span className="font-medium">{email}</span> to secure your
        account and enable password recovery.
      </p>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="outline" onClick={resend} disabled={pending}>
          {pending ? "Sending…" : "Resend link"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss for now"
        >
          Later
        </Button>
      </div>
    </div>
  );
}
