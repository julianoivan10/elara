import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AuthShell } from "@/features/auth/auth-shell";
import { ResetPasswordForm } from "@/features/auth/password-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthShell
        index="02"
        label="Password"
        title="This link is incomplete."
        description="Reset links only work in full. Request a new one and open it straight from your inbox."
      >
        <Button asChild size="lg">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      index="02"
      label="Password"
      title="Choose a new password."
      description="Setting a new password signs out every other device."
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
