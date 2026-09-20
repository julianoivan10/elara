"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/cn";
import { Eyebrow } from "@/components/ui/editorial";

/**
 * Radix handles focus trapping, scroll locking, escape and the aria wiring; this
 * layer only supplies ELARA's surface. Dialogs slide up a few pixels rather than
 * scaling, which reads as a sheet of paper being placed down.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  size = "md",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  size?: "sm" | "md" | "lg";
}) {
  const width =
    size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-3xl" : "max-w-lg";

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-ink/25 backdrop-blur-[1px]",
          "data-[state=open]:animate-[fade-in_180ms_var(--ease-out-soft)]",
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2",
          width,
          "max-h-[calc(100dvh-3rem)] overflow-y-auto",
          "rounded-lg border border-rule bg-surface shadow-(--shadow-lift)",
          "data-[state=open]:animate-[dialog-in_220ms_var(--ease-out-soft)]",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-sm text-ink-faint transition-colors hover:bg-raised hover:text-ink"
          aria-label="Close"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({
  label,
  title,
  description,
  className,
}: {
  label?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-rule px-5 py-4 pr-12",
        className,
      )}
    >
      {label ? <Eyebrow>{label}</Eyebrow> : null}
      <DialogPrimitive.Title className="text-[1.0625rem] font-medium tracking-[-0.02em] text-ink">
        {title}
      </DialogPrimitive.Title>
      {description ? (
        <DialogPrimitive.Description className="text-[0.8125rem] leading-relaxed text-ink-muted">
          {description}
        </DialogPrimitive.Description>
      ) : (
        <DialogPrimitive.Description className="sr-only">
          {typeof title === "string" ? title : "Dialog"}
        </DialogPrimitive.Description>
      )}
    </div>
  );
}

export function DialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("px-5 py-5", className)} {...props} />;
}

export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-rule px-5 py-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
