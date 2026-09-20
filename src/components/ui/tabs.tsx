"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/cn";

/**
 * Tabs read as document tabs: a hairline baseline with the active tab marked by
 * a solid ink rule, rather than a pill on a grey track.
 */
export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex items-center gap-5 overflow-x-auto border-b border-rule scrollbar-none",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative -mb-px shrink-0 whitespace-nowrap border-b-2 border-transparent px-0.5 pb-2.5 pt-1",
        "text-[0.8125rem] font-medium text-ink-faint transition-colors duration-150",
        "hover:text-ink",
        "data-[state=active]:border-ink data-[state=active]:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("outline-none", className)}
      {...props}
    />
  );
}
