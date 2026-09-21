import type { Metadata } from "next";
import { LogOut } from "lucide-react";

import { fullDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { AiService } from "@/services/ai.service";
import { isEmailConfigured } from "@/lib/env";
import { logoutAction } from "@/server/actions/auth.actions";
import { PageHeader, PageShell } from "@/features/workspace/page-header";
import {
  DeleteAccountDialog,
  NameForm,
  PasswordForm,
  VerifyEmailRow,
} from "@/features/workspace/settings-forms";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  const account = await db.user.findUnique({
    where: { id: user.id },
    select: {
      createdAt: true,
      // Read only to derive `hasPassword` below; the hash is never rendered.
      passwordHash: true,
      accounts: { select: { provider: true } },
      _count: {
        select: { resumes: true, applications: true, savedJobs: true },
      },
    },
  });

  const hasPassword = Boolean(account?.passwordHash);
  const usesGoogle = Boolean(
    account?.accounts.some((a) => a.provider === "google"),
  );

  return (
    <PageShell className="max-w-3xl">
      <PageHeader
        label="Account"
        title="Settings"
        description="Your account, your password, and what happens to your data."
      />

      <div className="flex flex-col gap-12">
        <Section index="01" title="Your account">
          <NameForm name={user.name} />
        </Section>

        <Section index="02" title="Email">
          <VerifyEmailRow
            email={user.email}
            verified={Boolean(user.emailVerifiedAt)}
          />
          {!isEmailConfigured ? (
            <p className="mt-4 rounded-md border border-rule bg-raised/60 px-3 py-2.5 text-[0.75rem] leading-relaxed text-ink-muted">
              No email provider is configured, so confirmation and reset links
              are written to the server console instead of being delivered. Set{" "}
              <code className="font-mono text-ink">RESEND_API_KEY</code> to send
              them for real.
            </p>
          ) : null}
        </Section>

        <Section index="03" title="Password">
          {usesGoogle ? (
            <p className="mb-4 text-[0.8125rem] leading-relaxed text-ink-muted">
              Google sign-in is connected to this account.
            </p>
          ) : null}
          {hasPassword ? (
            <PasswordForm />
          ) : (
            <p className="max-w-[60ch] text-[0.875rem] leading-relaxed text-ink-muted">
              You sign in with Google, so there is no password on this account.
              To add one, log out and use{" "}
              <span className="text-ink">Forgot password</span> on the login
              page; the link we email you lets you set it.
            </p>
          )}
        </Section>

        <Section index="04" title="Assistant">
          <p className="text-[0.875rem] leading-relaxed text-ink-muted">
            {AiService.configured
              ? "The assistant is switched on. It only ever reads what is on your profile, it rewrites wording rather than adding facts, and nothing it suggests is saved until you accept it."
              : "The assistant is off. Set GEMINI_API_KEY in your environment to switch it on. Everything else in ELARA works without it."}
          </p>
        </Section>

        <Section index="05" title="What is here">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {[
              { label: "Resumes", value: account?._count.resumes ?? 0 },
              {
                label: "Applications",
                value: account?._count.applications ?? 0,
              },
              { label: "Saved jobs", value: account?._count.savedJobs ?? 0 },
            ].map((item) => (
              <div key={item.label}>
                <dt className="eyebrow">{item.label}</dt>
                <dd
                  data-numeric
                  className="mt-1.5 font-mono text-[1.5rem] leading-none tracking-[-0.04em] text-ink"
                >
                  {item.value}
                </dd>
              </div>
            ))}
            <div>
              <dt className="eyebrow">Joined</dt>
              <dd className="mt-1.5 text-[0.875rem] text-ink">
                {fullDate(account?.createdAt) ?? "—"}
              </dd>
            </div>
          </dl>
        </Section>

        <Section index="06" title="Leaving">
          <div className="flex flex-col gap-5">
            <form action={logoutAction}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut />
                Log out
              </Button>
            </form>

            <div className="flex flex-col gap-3 rounded-md border border-danger/20 bg-danger-tint/50 p-4">
              <p className="text-[0.875rem] font-medium text-ink">
                Delete your account
              </p>
              <p className="max-w-[60ch] text-[0.8125rem] leading-relaxed text-ink-muted">
                Removes your career profile, every resume, your saved jobs and
                your whole application history. There is no recovery, so export
                any resume you want to keep first.
              </p>
              <div className="pt-1">
                <DeleteAccountDialog hasPassword={hasPassword} />
              </div>
            </div>
          </div>
        </Section>
      </div>
    </PageShell>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="flex items-baseline gap-4 border-b border-ink pb-3">
        <span
          data-numeric
          className="font-mono text-[0.6875rem] tracking-[0.1em] text-ink-ghost"
        >
          {index}
        </span>
        <h2 className="text-[1.0625rem] tracking-[-0.02em] text-ink">
          {title}
        </h2>
      </header>
      <div className="pt-5">{children}</div>
    </section>
  );
}
