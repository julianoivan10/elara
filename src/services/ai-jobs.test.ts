import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * AI output validation for the job features, with Gemini replaced by a mock:
 * whatever the model says, reviews for jobs that were not sent and text that
 * states figures the input did not contain never reach the person.
 */

const gemini = vi.hoisted(() => ({ text: "{}" }));

vi.mock("@/server/ai/gemini", () => ({
  AI_MODEL: "test-model",
  AiProviderError: class extends Error {},
  generateJson: vi.fn(async () => ({
    text: gemini.text,
    model: "test-model",
    inputTokens: 1,
    outputTokens: 1,
  })),
}));
vi.mock("@/server/db", () => ({
  db: { aiUsage: { create: vi.fn(async () => ({})) } },
}));
vi.stubEnv("GEMINI_API_KEY", "test-key");

const { AiService } = await import("@/services/ai.service");

beforeEach(() => {
  gemini.text = "{}";
});

const profile = {
  skills: ["React", "TypeScript"],
  targetRoles: ["Frontend Engineer"],
  roles: ["Frontend Developer at BlockLens"],
  projects: [{ name: "Elara", technologies: ["Next.js"] }],
};

describe("reviewJobMatches", () => {
  it("keeps reviews only for jobs that were sent, and drops invented figures", async () => {
    gemini.text = JSON.stringify({
      reviews: [
        {
          jobId: "job-1",
          verdict: "strong",
          why: ["React on your profile matches", "5 years of React experience"],
          gaps: ["AWS"],
        },
        { jobId: "someone-elses-job", verdict: "strong", why: ["x"], gaps: [] },
      ],
    });

    const result = await AiService.reviewJobMatches("u1", {
      profile,
      jobs: [
        {
          id: "job-1",
          title: "Frontend Engineer",
          company: "Acme",
          skills: ["React", "AWS"],
          requirements: [],
        },
      ],
    });

    expect(result).toEqual([
      {
        jobId: "job-1",
        verdict: "strong",
        why: ["React on your profile matches"],
        gaps: ["AWS"],
      },
    ]);
  });

  it("rejects a malformed verdict rather than showing it", async () => {
    gemini.text = JSON.stringify({
      reviews: [{ jobId: "job-1", verdict: "97% match", why: [] }],
    });
    await expect(
      AiService.reviewJobMatches("u1", {
        profile,
        jobs: [
          {
            id: "job-1",
            title: "t",
            company: "c",
            skills: [],
            requirements: [],
          },
        ],
      }),
    ).rejects.toThrow();
  });
});

describe("draftCoverLetter", () => {
  const input = {
    job: {
      title: "Frontend Engineer",
      company: "Acme",
      summary: "Build UI.",
      requirements: ["React"],
      responsibilities: [],
    },
    profile: {
      headline: "Frontend developer",
      summary: null,
      roles: [
        {
          role: "Frontend Developer",
          company: "BlockLens",
          summary: null,
          highlights: ["Built the dashboard in React"],
        },
      ],
      projects: [],
      education: [],
      skills: ["React"],
      certifications: [],
      achievements: [],
    },
  };

  it("returns a grounded draft", async () => {
    gemini.text = JSON.stringify({
      letter: "At BlockLens I built the dashboard in React.",
      notes: [],
    });
    await expect(AiService.draftCoverLetter("u1", input)).resolves.toEqual({
      letter: "At BlockLens I built the dashboard in React.",
      notes: [],
      filtered: false,
    });
  });

  it("discards a draft that invents a number", async () => {
    gemini.text = JSON.stringify({
      letter: "I grew revenue by 40% at BlockLens.",
      notes: [],
    });
    await expect(
      AiService.draftCoverLetter("u1", input),
    ).resolves.toMatchObject({ letter: null, filtered: true });
  });
});
