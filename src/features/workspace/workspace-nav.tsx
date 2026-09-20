"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

import { cn } from "@/lib/cn";
import { isActive, mobileNav, workspaceNav } from "@/config/navigation";
import { Eyebrow } from "@/components/ui/editorial";

/**
 * The workspace sidebar. Nothing like the marketing navbar: this is a tool, so
 * it is quiet, dense, and always shows where you are. The active item is marked
 * by a solid ink rule that slides between entries rather than a filled pill.
 */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Workspace" className="flex flex-col gap-7">
      {workspaceNav.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <Eyebrow className="px-3">{group.label}</Eyebrow>

          <ul className="flex flex-col">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;

              return (
                <li key={item.href} className="relative">
                  {active ? (
                    <motion.span
                      layoutId="sidebar-active"
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-0.5 rounded-full bg-ink"
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ) : null}

                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-sm px-3 py-1.5 text-[0.8125rem] transition-colors duration-150",
                      active
                        ? "text-ink"
                        : "text-ink-muted hover:bg-raised hover:text-ink",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0 transition-colors",
                        active
                          ? "text-ink"
                          : "text-ink-ghost group-hover:text-ink-faint",
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.index ? (
                      <span
                        data-numeric
                        className={cn(
                          "font-mono text-[0.625rem] tracking-[0.08em]",
                          active ? "text-ink-faint" : "text-ink-ghost",
                        )}
                      >
                        {item.index}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * The phone navigation is a bottom bar rather than a shrunken sidebar: five
 * destinations within thumb reach, clear of the browser chrome.
 */
export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Workspace"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="mx-auto flex max-w-lg">
        {mobileNav.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-col items-center gap-1 px-1 pb-2 pt-2.5"
              >
                {active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-[28%] top-0 h-0.5 rounded-full bg-ink"
                  />
                ) : null}
                <Icon
                  className={cn(
                    "size-4 transition-colors",
                    active ? "text-ink" : "text-ink-ghost",
                  )}
                />
                <span
                  className={cn(
                    "text-[0.6875rem] leading-none transition-colors",
                    active ? "text-ink" : "text-ink-faint",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
