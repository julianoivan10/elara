import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/editorial";
import { ProgressRule } from "@/components/ui/meter";
import { requireUser } from "@/server/auth/guards";
import { CareerService } from "@/services/career.service";
import { computeCompletion } from "@/lib/completion";
import { AiService } from "@/services/ai.service";
import { PageHeader, PageShell } from "@/features/workspace/page-header";
import { CompletionChecklist } from "@/features/dashboard/completion-panel";
import { ProfileReview } from "@/features/ai/profile-review";
import { BasicsForm } from "@/features/profile/basics-form";
import { ProfileSection } from "@/features/profile/section";
import { ExperienceSection } from "@/features/profile/experience-section";
import { EducationSection } from "@/features/profile/education-section";
import { SkillsSection } from "@/features/profile/skills-section";
import { ProjectsSection } from "@/features/profile/projects-section";
import {
  AchievementsSection,
  CertificationsSection,
  LanguagesSection,
  LinksSection,
} from "@/features/profile/misc-sections";

export const metadata: Metadata = { title: "Career profile" };
export const dynamic = "force-dynamic";
/** Covers the assistant's server actions on this page (see src/server/ai/gemini.ts). */
export const maxDuration = 60;

const JUMP_LINKS = [
  { href: "#basics", label: "Details" },
  { href: "#links", label: "Links" },
  { href: "#experience", label: "Experience" },
  { href: "#education", label: "Education" },
  { href: "#skills", label: "Skills" },
  { href: "#certifications", label: "Certifications" },
  { href: "#languages", label: "Languages" },
  { href: "#achievements", label: "Achievements" },
  { href: "#projects", label: "Projects" },
];

/**
 * The career profile: one structured record of what a person has done.
 *
 * Everything downstream — resumes, tailoring, job matching — reads from here,
 * so the page is organised as a document to fill in rather than a settings
 * screen, with the completion checklist alongside as the reason to keep going.
 */
export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await CareerService.getProfile(user.id);

  if (!profile) {
    // requireProfile creates the row; this only guards a torn state.
    await CareerService.ensureProfile(user.id, user.name);
  }

  const data = profile ?? (await CareerService.getProfile(user.id))!;
  const completion = computeCompletion(data);

  return (
    <PageShell>
      <PageHeader
        index="01"
        label="Career profile"
        title="Your career profile"
        description="Write it down once. Every resume, tailored application and job match in ELARA is built from what is on this page."
        actions={
          <Button asChild>
            <Link href="/resume">
              <FileText />
              Build a resume
            </Link>
          </Button>
        }
      />

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
        {/* ------------------------------------------------------- form */}
        <div className="flex min-w-0 flex-col gap-14 lg:col-span-8">
          <ProfileSection
            id="basics"
            index="01"
            title="Details"
            description="The header of every resume you export."
          >
            <BasicsForm
              aiEnabled={AiService.configured}
              basics={{
                fullName: data.fullName,
                headline: data.headline,
                summary: data.summary,
                location: data.location,
                phone: data.phone,
                website: data.website,
                openToWork: data.openToWork,
              }}
            />
          </ProfileSection>

          <LinksSection items={data.links} />
          <ExperienceSection
            items={data.experience}
            aiEnabled={AiService.configured}
          />
          <EducationSection items={data.education} />
          <SkillsSection items={data.skills} aiEnabled={AiService.configured} />
          <CertificationsSection items={data.certifications} />
          <LanguagesSection items={data.languages} />
          <AchievementsSection items={data.achievements} />
          <ProjectsSection
            items={data.projects}
            aiEnabled={AiService.configured}
          />
        </div>

        {/* ------------------------------------------------------ aside */}
        <aside className="min-w-0 lg:col-span-4">
          <div className="flex flex-col gap-8 lg:sticky lg:top-8">
            <section className="rounded-lg border border-rule bg-surface p-5">
              <div className="flex items-baseline justify-between gap-4">
                <Eyebrow>Completion</Eyebrow>
                <span
                  data-numeric
                  className="font-mono text-[1.5rem] leading-none tracking-[-0.04em] text-ink"
                >
                  {completion.percent}
                  <span className="text-ink-ghost">%</span>
                </span>
              </div>

              <ProgressRule value={completion.percent} className="mt-3" />

              <div className="mt-4">
                <CompletionChecklist completion={completion} />
              </div>
            </section>

            {AiService.configured ? <ProfileReview /> : null}

            <nav aria-label="Profile sections" className="hidden lg:block">
              <Eyebrow className="block border-b border-rule pb-2.5">
                Jump to
              </Eyebrow>
              <ul className="flex flex-col pt-1">
                {JUMP_LINKS.map((link, index) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="flex items-baseline gap-3 border-b border-rule py-2 text-[0.8125rem] text-ink-muted transition-colors last:border-b-0 hover:text-ink"
                    >
                      <span
                        data-numeric
                        className="font-mono text-[0.625rem] text-ink-ghost"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
