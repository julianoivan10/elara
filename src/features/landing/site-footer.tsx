import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { Eyebrow } from "@/components/ui/editorial";
import { site, stages } from "@/config/site";

const COLUMNS = [
  {
    label: "Workspace",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/profile", label: "Career profile" },
      { href: "/resume", label: "Resumes" },
      { href: "/projects", label: "Projects" },
    ],
  },
  {
    label: "Find work",
    links: [
      { href: "/jobs", label: "Job discovery" },
      { href: "/saved", label: "Saved jobs" },
      { href: "/applications", label: "Applications" },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/register", label: "Create your profile" },
      { href: "/login", label: "Log in" },
      { href: "/forgot-password", label: "Reset password" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-rule">
      <div className="gutter mx-auto max-w-[90rem] py-14">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Wordmark />
            <p className="mt-4 max-w-[34ch] text-[0.8125rem] leading-relaxed text-ink-muted">
              {site.description}
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 md:col-span-7 sm:grid-cols-3"
          >
            {COLUMNS.map((column) => (
              <div key={column.label} className="flex flex-col gap-3">
                <Eyebrow>{column.label}</Eyebrow>
                <ul className="flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* The workflow, restated once more as a closing rule. */}
        <div className="mt-12 flex flex-col gap-4 border-t border-rule pt-5 md:flex-row md:items-center md:justify-between">
          <ul className="scrollbar-none flex gap-5 overflow-x-auto">
            {stages.map((stage) => (
              <li
                key={stage.key}
                className="eyebrow flex shrink-0 items-center gap-1.5"
              >
                <span data-numeric className="text-ink-ghost">
                  {stage.index}
                </span>
                {stage.label}
              </li>
            ))}
          </ul>
          <p className="eyebrow shrink-0">
            © {new Date().getFullYear()} {site.name}
          </p>
        </div>
      </div>
    </footer>
  );
}
