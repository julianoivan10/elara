"use client";

import * as React from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";

import { cn } from "@/lib/cn";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export function DropdownMenuContent({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-44 overflow-hidden rounded-md border border-rule bg-surface p-1 shadow-(--shadow-lift)",
          "data-[state=open]:animate-[menu-in_140ms_var(--ease-out-soft)]",
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<typeof Menu.Item> & { tone?: "default" | "danger" }) {
  return (
    <Menu.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 py-1.5 text-[0.8125rem] outline-none",
        "[&_svg]:size-3.5 [&_svg]:text-ink-faint",
        tone === "danger"
          ? "text-danger data-[highlighted]:bg-danger-tint [&_svg]:text-danger"
          : "text-ink data-[highlighted]:bg-raised",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Label>) {
  return (
    <Menu.Label
      className={cn("eyebrow px-2.5 pb-1 pt-2", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Menu.Separator>) {
  return (
    <Menu.Separator
      className={cn("-mx-1 my-1 h-px bg-rule", className)}
      {...props}
    />
  );
}

export const DropdownMenuGroup = Menu.Group;
