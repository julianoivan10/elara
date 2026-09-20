import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

/**
 * ELARA buttons.
 *
 * The primary action is near-black rather than blue: cobalt is reserved for
 * links, selected states and data, so the page keeps a single loud colour.
 * Every button shares one press interaction — a 1px drop — so the whole product
 * feels physical in the same way.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-md font-medium tracking-[-0.01em]",
    "transition-[background-color,color,border-color,box-shadow,transform] duration-150 ease-out-soft",
    "active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "bg-ink text-paper hover:bg-cobalt",
        accent: "bg-cobalt text-white hover:bg-cobalt-ink",
        lime: "bg-lime text-ink hover:bg-lime-deep",
        outline:
          "border border-rule-strong bg-surface text-ink hover:bg-raised hover:border-ink",
        subtle: "bg-raised text-ink hover:bg-sunk",
        ghost: "text-ink-muted hover:bg-raised hover:text-ink",
        link: "text-cobalt-ink underline underline-offset-4 decoration-cobalt-soft hover:decoration-cobalt-ink",
        danger:
          "border border-danger/30 bg-danger-tint text-danger hover:bg-danger hover:text-white hover:border-danger",
      },
      size: {
        sm: "h-8 px-3 text-[0.8125rem] [&_svg]:size-3.5",
        md: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-[0.9375rem] [&_svg]:size-4",
        icon: "size-9 [&_svg]:size-4",
        "icon-sm": "size-7 rounded-sm [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
