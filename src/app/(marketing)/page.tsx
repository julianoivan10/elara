import { Hero } from "@/features/landing/hero";
import { HowItWorks } from "@/features/landing/how-it-works";
import { ResumeShowcase } from "@/features/landing/resume-showcase";
import { AiSection } from "@/features/landing/ai-section";
import { JobsSection } from "@/features/landing/jobs-section";
import { FinalCta } from "@/features/landing/final-cta";

/**
 * The landing page is a narrative, not a feature list: what ELARA is, how the
 * five stages connect, what a resume actually looks like, what the assistant
 * will and will not do, and where an application ends up.
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <ResumeShowcase />
      <AiSection />
      <JobsSection />
      <FinalCta />
    </>
  );
}
