"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/cn";

/**
 * Form primitives.
 *
 * Inputs are underline-led rather than boxed: a hairline bottom rule that
 * thickens to cobalt on focus. It matches the editorial ruling used everywhere
 * else and keeps dense forms (the resume editor) from turning into a grid of
 * boxes. `Field` wires label / control / hint / error ids together so every
 * control is announced correctly.
 */

const FieldContext = React.createContext<{
  id: string;
  hintId: string;
  errorId: string;
  hasError: boolean;
} | null>(null);

function useField() {
  const ctx = React.useContext(FieldContext);
  if (!ctx) throw new Error("Field parts must be used inside <Field>");
  return ctx;
}

export function Field({
  children,
  error,
  className,
}: {
  children: React.ReactNode;
  error?: string | null;
  className?: string;
}) {
  const id = React.useId();
  const value = React.useMemo(
    () => ({
      id,
      hintId: `${id}-hint`,
      errorId: `${id}-error`,
      hasError: Boolean(error),
    }),
    [id, error],
  );

  return (
    <FieldContext.Provider value={value}>
      <div className={cn("flex flex-col gap-1.5", className)}>
        {children}
        {error ? (
          <p
            id={value.errorId}
            role="alert"
            className="text-[0.75rem] leading-snug text-danger"
          >
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

export function FieldLabel({
  className,
  children,
  optional,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { optional?: boolean }) {
  const { id } = useField();
  return (
    <LabelPrimitive.Root
      htmlFor={id}
      className={cn(
        "flex items-baseline justify-between gap-3 text-[0.8125rem] font-medium text-ink",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {optional ? (
        <span className="eyebrow text-[0.625rem]">Optional</span>
      ) : null}
    </LabelPrimitive.Root>
  );
}

export function FieldHint({ className, ...props }: React.ComponentProps<"p">) {
  const { hintId } = useField();
  return (
    <p
      id={hintId}
      className={cn("text-[0.75rem] leading-snug text-ink-faint", className)}
      {...props}
    />
  );
}

function describedBy(ctx: ReturnType<typeof useField>) {
  return ctx.hasError ? ctx.errorId : ctx.hintId;
}

const controlBase = [
  "w-full bg-transparent text-ink placeholder:text-ink-ghost",
  "border-0 border-b border-rule rounded-none px-0 pb-2 pt-1",
  "transition-[border-color,box-shadow] duration-150 ease-out-soft",
  "outline-none focus-visible:outline-none",
  "focus:border-cobalt focus:shadow-[0_1px_0_0_var(--color-cobalt)]",
  "disabled:text-ink-ghost disabled:cursor-not-allowed",
].join(" ");

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  const ctx = useField();
  return (
    <input
      id={ctx.id}
      aria-describedby={describedBy(ctx)}
      aria-invalid={ctx.hasError || undefined}
      className={cn(
        controlBase,
        "text-[0.9375rem]",
        ctx.hasError &&
          "border-danger focus:border-danger focus:shadow-[0_1px_0_0_var(--color-danger)]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  const ctx = useField();
  return (
    <textarea
      id={ctx.id}
      aria-describedby={describedBy(ctx)}
      aria-invalid={ctx.hasError || undefined}
      className={cn(
        controlBase,
        "min-h-24 resize-y text-[0.9375rem] leading-relaxed",
        ctx.hasError && "border-danger focus:border-danger",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A native select, styled to match. Radix Select is used only where the trigger
 * needs rich content — a plain list of options does not justify the JS.
 */
export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  const ctx = useField();
  return (
    <div className="relative">
      <select
        id={ctx.id}
        aria-describedby={describedBy(ctx)}
        aria-invalid={ctx.hasError || undefined}
        className={cn(
          controlBase,
          "appearance-none pr-6 text-[0.9375rem]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 10 6"
        className="pointer-events-none absolute right-0 top-1/2 h-1.5 w-2.5 -translate-y-1/2 text-ink-faint"
      >
        <path
          d="M1 1l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/** Standalone label for controls that are not inside a Field. */
export const Label = LabelPrimitive.Root;
