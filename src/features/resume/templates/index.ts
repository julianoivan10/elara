import type { TemplateProps } from "@/features/resume/templates/primitives";
import { EditorialTemplate } from "@/features/resume/templates/editorial";
import { MinimalTemplate } from "@/features/resume/templates/minimal";
import { ModernTemplate } from "@/features/resume/templates/modern";
import { CompactTemplate } from "@/features/resume/templates/compact";

/**
 * The template registry.
 *
 * Templates are code, not database rows — which is why there is no
 * ResumeTemplate table. A resume stores only a `templateKey`, and anything
 * unknown falls back to Editorial rather than failing to render.
 */
export type ResumeTemplate = {
  key: string;
  name: string;
  description: string;
  /** Shown in the template picker so the choice is an informed one. */
  bestFor: string;
  Component: (props: TemplateProps) => React.JSX.Element;
};

export const RESUME_TEMPLATES: ResumeTemplate[] = [
  {
    key: "editorial",
    name: "Editorial",
    description:
      "Numbered section labels set in the left margin, with a ruled header.",
    bestFor: "Design, product and front-end roles",
    Component: EditorialTemplate,
  },
  {
    key: "minimal",
    name: "Minimal",
    description:
      "Centred header, no colour, and space instead of rules. Parses anywhere.",
    bestFor: "Academic, research and formal applications",
    Component: MinimalTemplate,
  },
  {
    key: "modern",
    name: "Modern",
    description:
      "A supporting column for skills and education beside the main record.",
    bestFor: "Engineering roles with a long skills list",
    Component: ModernTemplate,
  },
  {
    key: "compact",
    name: "Compact",
    description:
      "Tight leading and inline skills, to keep a long career on one page.",
    bestFor: "Senior profiles with eight or more years of history",
    Component: CompactTemplate,
  },
];

export const DEFAULT_TEMPLATE_KEY = "editorial";

export function getTemplate(key: string | null | undefined): ResumeTemplate {
  return (
    RESUME_TEMPLATES.find((template) => template.key === key) ??
    RESUME_TEMPLATES[0]
  );
}
