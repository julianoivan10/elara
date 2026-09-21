import type { Metadata } from "next";

import { Eyebrow } from "@/components/ui/editorial";
import { requireUser } from "@/server/auth/guards";
import { CareerService } from "@/services/career.service";
import { AiService } from "@/services/ai.service";
import { PageHeader, PageShell } from "@/features/workspace/page-header";
import {
  AddProjectButton,
  ProjectsSection,
} from "@/features/profile/projects-section";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";
/** Covers the assistant's server actions on this page (see src/server/ai/gemini.ts). */
export const maxDuration = 60;

/**
 * The portfolio. Same records as the profile's projects section, given room to
 * breathe — projects are often the strongest evidence a student or graduate has.
 */
export default async function ProjectsPage() {
  const user = await requireUser();
  const profile = await CareerService.getProfile(user.id);
  const projects = profile?.projects ?? [];

  const featured = projects.filter((project) => project.featured);

  return (
    <PageShell>
      <PageHeader
        label="Portfolio"
        title="Projects"
        description="Work you can point at. Anything here can be pulled into a resume, and the assistant reads it when tailoring an application."
        actions={<AddProjectButton />}
      />

      {featured.length > 0 ? (
        <div className="mb-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-rule bg-raised/60 px-4 py-3">
          <Eyebrow>Featured</Eyebrow>
          <ul className="flex flex-wrap gap-2">
            {featured.map((project) => (
              <li
                key={project.id}
                className="rounded-xs border border-lime-deep/40 bg-lime-tint px-1.5 py-0.5 text-[0.75rem] text-[#4b6106]"
              >
                {project.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ProjectsSection
        items={projects}
        standalone
        aiEnabled={AiService.configured}
      />
    </PageShell>
  );
}
