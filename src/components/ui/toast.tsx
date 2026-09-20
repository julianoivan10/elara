"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, CircleAlert, Info } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * A minimal toast stack. Written rather than installed: the product needs three
 * tones, auto-dismiss and a polite live region, which is less code than the
 * configuration a toast library would need.
 */

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
  detail?: string;
};

type ToastContextValue = {
  toast: (
    message: string,
    options?: { tone?: ToastTone; detail?: string },
  ) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const ICONS: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  success: Check,
  error: CircleAlert,
  info: Info,
};

const TONE_CLASS: Record<ToastTone, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-cobalt-ink",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const toast = React.useCallback<ToastContextValue["toast"]>(
    (message, options) => {
      const id = nextId.current++;
      const entry: Toast = {
        id,
        message,
        tone: options?.tone ?? "success",
        detail: options?.detail,
      };
      setToasts((current) => [...current.slice(-2), entry]);
      window.setTimeout(
        () => {
          setToasts((current) => current.filter((t) => t.id !== id));
        },
        entry.tone === "error" ? 6500 : 3800,
      );
    },
    [],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-5"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.tone];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-2.5",
                  "rounded-md border border-rule bg-surface px-3.5 py-2.5 shadow-(--shadow-lift)",
                )}
              >
                <Icon
                  className={cn("mt-0.5 size-3.5 shrink-0", TONE_CLASS[t.tone])}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] font-medium text-ink">
                    {t.message}
                  </p>
                  {t.detail ? (
                    <p className="mt-0.5 text-[0.75rem] leading-snug text-ink-muted">
                      {t.detail}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
