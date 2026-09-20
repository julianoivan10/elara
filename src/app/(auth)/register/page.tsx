import type { Metadata } from "next";
import Link from "next/link";

import { requireGuest } from "@/server/auth/guards";
import { AuthShell } from "@/features/auth/auth-shell";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Create your profile" };

export default async function RegisterPage() {
  await requireGuest();

  return (
    <AuthShell
      index="01"
      label="Get started"
      title="Create your career profile."
      description="One account for your profile, resumes, saved jobs and applications."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-cobalt-ink underline decoration-cobalt-soft underline-offset-4 hover:decoration-cobalt-ink"
          >
            Log in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
