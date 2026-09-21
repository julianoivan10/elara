import type { Metadata } from "next";
import Link from "next/link";

import { requireGuest } from "@/server/auth/guards";
import { isGoogleConfigured } from "@/lib/env";
import { GoogleSignIn } from "@/features/auth/google-sign-in";
import { oauthErrorMessage } from "@/features/auth/oauth-errors";
import { AuthShell } from "@/features/auth/auth-shell";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Create your profile" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireGuest();
  // A Google attempt that came back with ?error=<code> (see oauth-errors.ts).
  const googleError = oauthErrorMessage((await searchParams).error);

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
      {isGoogleConfigured ? (
        <GoogleSignIn label="Sign up with Google" error={googleError} />
      ) : null}
      <RegisterForm />
    </AuthShell>
  );
}
