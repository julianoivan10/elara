"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings, ShieldCheck } from "lucide-react";

import { initials } from "@/lib/format";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/server/actions/auth.actions";

export function AccountMenu({
  name,
  email,
  verified,
}: {
  name: string;
  email: string;
  verified: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-md border border-transparent px-2 py-2 text-left transition-colors hover:border-rule hover:bg-surface">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-ink text-[0.6875rem] font-medium text-paper"
        >
          {initials(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] font-medium text-ink">
            {name}
          </span>
          <span className="block truncate text-[0.6875rem] text-ink-faint">
            {email}
          </span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-ink-ghost" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="min-w-56">
        <DropdownMenuLabel>Account</DropdownMenuLabel>

        {!verified ? (
          <DropdownMenuItem asChild>
            <Link href="/verify-email">
              <ShieldCheck />
              Confirm your email
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <form action={logoutAction}>
          <DropdownMenuItem asChild tone="danger">
            <button type="submit" className="w-full">
              <LogOut />
              Log out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
