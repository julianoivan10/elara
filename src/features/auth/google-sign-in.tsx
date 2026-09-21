"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/cn";
import { buttonVariants } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";

/**
 * "Continue with Google", the "or" rule under it, and any message from a
 * Google attempt that came back here.
 *
 * A plain link, not a fetch: the sign-in is a full-page trip to Google and
 * back, and a link is what makes that work without JavaScript as well.
 */
export function GoogleSignIn({
  label = "Continue with Google",
  error,
}: {
  label?: string;
  /** Message for an ?error= code, already resolved on the server. */
  error?: string | null;
}) {
  const [redirecting, setRedirecting] = React.useState(false);

  // Coming back with the browser's Back button restores this page from the
  // back/forward cache with the spinner still showing. Reset it.
  React.useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setRedirecting(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  return (
    // Bottom padding matches the gap between fields in the form that follows.
    <div className="flex flex-col gap-5 pb-5">
      {error ? (
        <FormMessage state={{ status: "error", message: error }} />
      ) : null}

      <a
        href="/api/auth/google"
        onClick={(event) => {
          // One trip at a time: a second click would start a second attempt
          // and overwrite the first one's state cookie.
          if (redirecting) event.preventDefault();
          else setRedirecting(true);
        }}
        aria-busy={redirecting}
        aria-disabled={redirecting}
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "w-full",
          redirecting && "pointer-events-none opacity-70",
        )}
      >
        {redirecting ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <GoogleMark />
        )}
        {redirecting ? "Redirecting to Google…" : label}
      </a>

      <div className="flex items-center gap-3" role="separator">
        <span aria-hidden className="h-px flex-1 bg-rule" />
        <span className="eyebrow text-ink-faint">or</span>
        <span aria-hidden className="h-px flex-1 bg-rule" />
      </div>
    </div>
  );
}

/** Google's "G" mark, in its brand colours as the sign-in guidelines require. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden className="size-4 shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
