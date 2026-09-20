"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";

import { cn } from "@/lib/cn";
import {
  demoExperience,
  demoPerson,
  demoProjects,
  demoSkills,
} from "@/features/landing/demo-data";

/**
 * The hero centrepiece: a career profile assembling itself into a resume.
 *
 * The sequence is the product's thesis in ten seconds — a blank page, then your
 * details, then experience, projects and skills settling into place. It is built
 * from real type at real proportions rather than a fake dashboard screenshot, so
 * what the visitor sees is what the editor actually produces.
 *
 * Motion rules: everything is transform / opacity / clip-path (no layout work),
 * the whole sequence plays once and then rests, and prefers-reduced-motion skips
 * straight to the finished page.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

const page: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.45 } },
};

const block: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, ease: EASE, staggerChildren: 0.055 },
  },
};

/** Text lines wipe in from the left, the way a line gets written. */
const wipe: Variants = {
  hidden: { clipPath: "inset(0 100% 0 0)", opacity: 0.2 },
  show: {
    clipPath: "inset(0 0% 0 0)",
    opacity: 1,
    transition: { duration: 0.55, ease: EASE },
  },
};

const drawRule: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.7, ease: EASE } },
};

const chip: Variants = {
  hidden: { opacity: 0, y: 6, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: EASE },
  },
};

export function HeroDocument() {
  const reduced = useReducedMotion();

  // Pointer parallax — a few degrees at most, and only on a fine pointer.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [2.6, -2.6]), {
    stiffness: 120,
    damping: 18,
  });
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [-2.2, 2.2]), {
    stiffness: 120,
    damping: 18,
  });

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduced || event.pointerType !== "mouse") return;
      const rect = event.currentTarget.getBoundingClientRect();
      px.set((event.clientX - rect.left) / rect.width - 0.5);
      py.set((event.clientY - rect.top) / rect.height - 0.5);
    },
    [px, py, reduced],
  );

  const onPointerLeave = React.useCallback(() => {
    px.set(0);
    py.set(0);
  }, [px, py]);

  return (
    <div
      role="img"
      aria-label={`A resume for ${demoPerson.name} assembling itself: profile details, experience, projects and skills.`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative mx-auto w-full max-w-[26rem] [perspective:1400px] lg:max-w-[28rem]"
    >
      {/* Offset blocks behind the sheet: the other resumes in the drawer. */}
      <motion.div
        aria-hidden
        initial={reduced ? false : { opacity: 0, x: 0, y: 0, rotate: 0 }}
        animate={{ opacity: 1, x: 18, y: 14, rotate: 2.4 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
        style={{ rotateY, rotateX }}
        className="absolute inset-0 rounded-[3px] border border-rule bg-surface/70"
      />
      <motion.div
        aria-hidden
        initial={reduced ? false : { opacity: 0, x: 0, y: 0, rotate: 0 }}
        animate={{ opacity: 1, x: 9, y: 7, rotate: 1.1 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.08 }}
        style={{ rotateY, rotateX }}
        className="absolute inset-0 rounded-[3px] border border-rule bg-surface"
      />

      {/* A lime block peeking from behind the top-left corner. */}
      <motion.span
        aria-hidden
        initial={reduced ? false : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
        className="absolute -left-2.5 -top-2.5 z-10 size-9 rounded-[2px] bg-lime"
      />

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 22, rotate: -2.4 }}
        animate={{ opacity: 1, y: 0, rotate: -1.1 }}
        transition={{ duration: 1, ease: EASE }}
        style={{ rotateY, rotateX }}
        className={cn(
          "relative z-20 aspect-[1/1.414] w-full origin-center overflow-hidden",
          "rounded-[3px] border border-rule bg-surface shadow-(--shadow-lift)",
          "will-change-transform",
        )}
      >
        {/* The page's own left margin rule — where the section indices sit. */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-[13%] w-px bg-rule/70"
        />

        <motion.div
          variants={page}
          initial={reduced ? "show" : "hidden"}
          animate="show"
          className="flex h-full flex-col gap-[3.2%] p-[7%] pl-[16%]"
        >
          {/* ---------------------------------------------------- header */}
          <motion.div variants={block} className="flex flex-col gap-[0.35rem]">
            <motion.p
              variants={wipe}
              className="text-[clamp(0.95rem,3.1vw,1.15rem)] font-medium leading-none tracking-[-0.03em] text-ink"
            >
              {demoPerson.name}
            </motion.p>
            <motion.p
              variants={wipe}
              className="text-[clamp(0.5rem,1.65vw,0.625rem)] leading-none text-ink-muted"
            >
              {demoPerson.headline}
            </motion.p>
            <motion.p
              variants={wipe}
              className="font-mono text-[clamp(0.4rem,1.3vw,0.5rem)] leading-none tracking-[0.04em] text-ink-faint"
            >
              {demoPerson.location} · {demoPerson.email} · {demoPerson.site}
            </motion.p>
          </motion.div>

          <motion.span
            variants={drawRule}
            aria-hidden
            className="h-px w-full origin-left bg-rule-strong"
          />

          {/* ------------------------------------------------ experience */}
          <Section index="01" title="Experience">
            {demoExperience.map((item) => (
              <motion.div
                key={item.company}
                variants={block}
                className="flex flex-col gap-[0.2rem]"
              >
                <motion.div
                  variants={wipe}
                  className="flex items-baseline justify-between gap-2"
                >
                  <span className="text-[clamp(0.52rem,1.7vw,0.66rem)] font-medium leading-tight text-ink">
                    {item.role}
                    <span className="text-ink-faint"> · {item.company}</span>
                  </span>
                  <span
                    data-numeric
                    className="shrink-0 font-mono text-[clamp(0.38rem,1.2vw,0.47rem)] text-ink-faint"
                  >
                    {item.period}
                  </span>
                </motion.div>

                {item.bullets.map((bullet) => (
                  <motion.p
                    key={bullet}
                    variants={wipe}
                    className="flex gap-1.5 text-[clamp(0.44rem,1.42vw,0.56rem)] leading-[1.45] text-ink-muted"
                  >
                    <span
                      aria-hidden
                      className="mt-[0.42em] size-[2.5px] shrink-0 rounded-full bg-ink-ghost"
                    />
                    <span>{bullet}</span>
                  </motion.p>
                ))}
              </motion.div>
            ))}
          </Section>

          {/* -------------------------------------------------- projects */}
          <Section index="02" title="Projects">
            {demoProjects.map((item) => (
              <motion.div
                key={item.name}
                variants={block}
                className="flex flex-col gap-[0.15rem]"
              >
                <motion.p
                  variants={wipe}
                  className="text-[clamp(0.52rem,1.7vw,0.66rem)] font-medium leading-tight text-ink"
                >
                  {item.name}
                  <span className="text-ink-faint"> · {item.role}</span>
                </motion.p>
                <motion.p
                  variants={wipe}
                  className="text-[clamp(0.44rem,1.42vw,0.56rem)] leading-[1.45] text-ink-muted"
                >
                  {item.description}
                </motion.p>
              </motion.div>
            ))}
          </Section>

          {/* ---------------------------------------------------- skills */}
          <Section index="03" title="Skills">
            <motion.div
              variants={block}
              className="flex flex-wrap gap-[0.25rem]"
            >
              {demoSkills.map((skill) => (
                <motion.span
                  key={skill}
                  variants={chip}
                  className="rounded-[2px] border border-rule bg-raised px-[0.35em] py-[0.18em] text-[clamp(0.4rem,1.3vw,0.5rem)] leading-tight text-ink-muted"
                >
                  {skill}
                </motion.span>
              ))}
            </motion.div>
          </Section>

          {/* The caret rests at the end of the written page. */}
          <motion.span
            variants={block}
            aria-hidden
            className="mt-auto inline-block h-[0.85em] w-[1.5px] bg-cobalt"
            style={
              reduced
                ? undefined
                : { animation: "caret 1.15s steps(1) infinite" }
            }
          />
        </motion.div>
      </motion.div>
    </div>
  );
}

/** A page section with its index sitting out in the left margin. */
function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      variants={block}
      className="relative flex flex-col gap-[0.4rem]"
    >
      <span
        aria-hidden
        data-numeric
        className="absolute right-full mr-[0.9rem] mt-[0.12rem] font-mono text-[clamp(0.38rem,1.2vw,0.47rem)] leading-none text-ink-ghost"
      >
        {index}
      </span>
      <motion.p
        variants={wipe}
        className="font-mono text-[clamp(0.4rem,1.28vw,0.5rem)] uppercase leading-none tracking-[0.16em] text-ink-faint"
      >
        {title}
      </motion.p>
      {children}
    </motion.section>
  );
}
