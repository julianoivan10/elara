import type { Metadata } from "next";
import Link from "next/link";

import { requireGuest } from "@/server/auth/guards";
import { isGoogleConfigured } from "@/lib/env";
import { GoogleSignIn } from "@/features/auth/google-sign-in";
import { oauthErrorMessage } from "@/features/auth/oauth-errors";
import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
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
      label="Welcome back"
      title="Log in to your workspace."
      footer={
        <>
          No account yet?{" "}
          <Link
            href="/register"
            className="text-cobalt-ink underline decoration-cobalt-soft underline-offset-4 hover:decoration-cobalt-ink"
          >
            Create your profile
          </Link>
        </>
      }
    >
      {isGoogleConfigured ? (
        <GoogleSignIn label="Continue with Google" error={googleError} />
      ) : null}
      <LoginForm />
    </AuthShell>
  );
}
