"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Menu, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { useSignedInHint } from "@/hooks/use-client-value";

const LINKS = [
  { href: "#workflow", label: "Product" },
  { href: "#how", label: "How it works" },
  { href: "#resume", label: "Resume" },
  { href: "#jobs", label: "Jobs" },
] as const;

/**
 * The marketing navbar stays 64px tall and gains its bottom rule only once the
 * page has scrolled, so the hero starts against uninterrupted paper.
 */
export function SiteNav() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const signedIn = useSignedInHint();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock the page behind the mobile sheet.
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-rule bg-paper/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <nav
        aria-label="Main"
        className="gutter mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-6"
      >
        <Link
          href="/"
          className="rounded-sm transition-opacity hover:opacity-70"
          aria-label="ELARA home"
        >
          <Wordmark />
        </Link>

        <ul className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="group relative inline-block py-1 text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
              >
                {link.label}
                <span
                  aria-hidden
                  className="absolute -bottom-px left-0 h-px w-full origin-left scale-x-0 bg-ink transition-transform duration-300 ease-out-soft group-hover:scale-x-100"
                />
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-1.5 md:flex">
          {signedIn ? (
            <Button asChild size="sm" variant="primary">
              <Link href="/dashboard">
                Open workspace
                <ArrowUpRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm" variant="primary">
                <Link href="/register">Create your profile</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="-mr-1.5 flex size-9 items-center justify-center rounded-md text-ink transition-colors hover:bg-raised md:hidden"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Menu className="size-5" />
        </button>
      </nav>

      <AnimatePresence>
        {open ? (
          <MobileSheet signedIn={signedIn} onClose={() => setOpen(false)} />
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function MobileSheet({
  signedIn,
  onClose,
}: {
  signedIn: boolean;
  onClose: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex flex-col bg-paper md:hidden"
    >
      <div className="gutter flex h-16 shrink-0 items-center justify-between">
        <Wordmark />
        <button
          type="button"
          onClick={onClose}
          className="-mr-1.5 flex size-9 items-center justify-center rounded-md text-ink transition-colors hover:bg-raised"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="gutter flex flex-1 flex-col justify-between pb-8 pt-4">
        <ul className="flex flex-col">
          {LINKS.map((link, i) => (
            <motion.li
              key={link.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.04 + i * 0.045,
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="border-b border-rule"
            >
              <a
                href={link.href}
                onClick={onClose}
                className="flex items-baseline justify-between py-4"
              >
                <span className="text-[1.75rem] tracking-[-0.03em] text-ink">
                  {link.label}
                </span>
                <span className="eyebrow" data-numeric>
                  {String(i + 1).padStart(2, "0")}
                </span>
              </a>
            </motion.li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 pt-8">
          {signedIn ? (
            <Button asChild size="lg">
              <Link href="/dashboard">Open workspace</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href="/register">Create your profile</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Log in</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
