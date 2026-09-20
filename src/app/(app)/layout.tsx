import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { ToastProvider } from "@/components/ui/toast";
import { requireUser } from "@/server/auth/guards";
import { AccountMenu } from "@/features/workspace/account-menu";
import { MobileTabBar, SidebarNav } from "@/features/workspace/workspace-nav";
import { VerifyEmailBanner } from "@/features/workspace/verify-email-banner";

/**
 * The workspace shell.
 *
 * `requireUser` runs here, so every route underneath is authenticated by
 * construction — a page cannot forget the check. Mutations still verify
 * ownership of the specific row they touch.
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <ToastProvider>
      <div className="flex min-h-dvh">
        {/* -------------------------------------------------- sidebar */}
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-rule bg-paper lg:flex">
          <div className="flex h-16 shrink-0 items-center px-5">
            <Link
              href="/dashboard"
              className="rounded-sm transition-opacity hover:opacity-70"
              aria-label="ELARA dashboard"
            >
              <Wordmark />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-4">
            <SidebarNav />
          </div>

          <div className="shrink-0 border-t border-rule p-2">
            <AccountMenu
              name={user.name}
              email={user.email}
              verified={Boolean(user.emailVerifiedAt)}
            />
          </div>
        </aside>

        {/* ----------------------------------------------------- main */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Phone header: the sidebar is replaced by a bottom bar, so this
              only carries the wordmark and the account menu. */}
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-rule bg-paper/95 px-4 backdrop-blur-md lg:hidden">
            <Link href="/dashboard" aria-label="ELARA dashboard">
              <Wordmark />
            </Link>
            <div className="w-44">
              <AccountMenu
                name={user.name}
                email={user.email}
                verified={Boolean(user.emailVerifiedAt)}
              />
            </div>
          </header>

          <VerifyEmailBanner
            verified={Boolean(user.emailVerifiedAt)}
            email={user.email}
          />

          <main id="main" className="flex-1 pb-24 lg:pb-0">
            {children}
          </main>
        </div>

        <MobileTabBar />
      </div>
    </ToastProvider>
  );
}
