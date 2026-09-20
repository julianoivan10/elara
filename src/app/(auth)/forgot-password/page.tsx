import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/features/auth/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/password-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      index="02"
      label="Password"
      title="Reset your password."
      description="Give us the address on your account and we will send a link to set a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/login"
            className="text-cobalt-ink underline decoration-cobalt-soft underline-offset-4 hover:decoration-cobalt-ink"
          >
            Back to log in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
