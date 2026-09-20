import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/auth-shell";
import { verifyEmailAction } from "@/server/actions/auth.actions";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Confirm your email" };

/**
 * Verification runs on load from the link in the email. There is no button to
 * press, because the click in the inbox was the confirmation.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await getSessionUser();

  if (!token) {
    return (
      <AuthShell
        index="03"
        label="Email"
        title="Confirm your email."
        description={
          user
            ? `We sent a link to ${user.email}. Open it to confirm this address.`
            : "Open the link we emailed you to confirm your address."
        }
      >
        <Button asChild size="lg" variant="outline">
          <Link href={user ? "/dashboard" : "/login"}>
            {user ? "Back to the workspace" : "Back to log in"}
          </Link>
        </Button>
      </AuthShell>
    );
  }

  const result = await verifyEmailAction(token);
  const confirmed = result.status === "ok";

  return (
    <AuthShell
      index="03"
      label="Email"
      title={confirmed ? "That is confirmed." : "We could not confirm that."}
      description={result.message}
    >
      <div className="flex flex-col gap-5">
        <p
          className={
            confirmed
              ? "flex items-start gap-2 rounded-md border border-success/25 bg-success-tint px-3 py-2.5 text-[0.8125rem] text-success"
              : "flex items-start gap-2 rounded-md border border-danger/25 bg-danger-tint px-3 py-2.5 text-[0.8125rem] text-danger"
          }
        >
          {confirmed ? (
            <CircleCheck className="mt-px size-3.5 shrink-0" />
          ) : (
            <CircleAlert className="mt-px size-3.5 shrink-0" />
          )}
          <span>
            {confirmed
              ? "Your address is verified. Everything in the workspace is available."
              : "Sign in and send yourself a fresh confirmation link."}
          </span>
        </p>

        <Button asChild size="lg">
          <Link href={user ? "/dashboard" : "/login"}>
            {user ? "Go to your dashboard" : "Log in"}
          </Link>
        </Button>
      </div>
    </AuthShell>
  );
}
