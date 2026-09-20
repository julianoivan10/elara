import type { Metadata } from "next";
import Link from "next/link";

import { requireGuest } from "@/server/auth/guards";
import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  await requireGuest();

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
      <LoginForm />
    </AuthShell>
  );
}
