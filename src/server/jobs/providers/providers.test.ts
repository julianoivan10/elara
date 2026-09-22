import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ashbyProvider } from "@/server/jobs/providers/ashby";
import { greenhouseProvider } from "@/server/jobs/providers/greenhouse";
import { leverProvider } from "@/server/jobs/providers/lever";
import { adzunaProvider } from "@/server/jobs/providers/adzuna";
import { fetchJson, ProviderError } from "@/server/jobs/http";

/**
 * Provider mapping against real responses (trimmed samples of the live Ashby,
 * Greenhouse and Lever board APIs, plus deliberately broken items). The
 * network is mocked: no test here calls a provider.
 */

const fixture = (name: string) =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`./__fixtures__/${name}.json`, import.meta.url)),
      "utf8",
    ),
  );

function respondWith(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
        headers,
      }),
    );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Ashby", () => {
  it("maps the public job board and skips malformed items", async () => {
    const fetchSpy = respondWith(fixture("ashby"));
    const { jobs, skipped } = await ashbyProvider.fetchJobs({
      key: "linear",
      name: "Linear",
    });

    expect(String(fetchSpy.mock.calls[0][0])).toBe(
      "https://api.ashbyhq.com/posting-api/job-board/linear?includeCompensation=true",
    );
    expect(skipped).toBe(1); // the item with no id
    expect(jobs).toHaveLength(4);

    const remote = jobs[0];
    expect(remote).toMatchObject({
      provider: "ashby",
      externalId: "d3bc1ced-3ce4-4086-a050-555055dbb1ff",
      title: "Senior / Staff Fullstack Engineer",
      company: "Linear",
      location: "Europe",
      locationType: "REMOTE",
      employmentType: "FULL_TIME",
      seniority: "SENIOR",
      applyUrl:
        "https://jobs.ashbyhq.com/linear/d3bc1ced-3ce4-4086-a050-555055dbb1ff/application",
      sourceUrl:
        "https://jobs.ashbyhq.com/linear/d3bc1ced-3ce4-4086-a050-555055dbb1ff",
    });
    expect(remote.postedAt?.toISOString()).toBe("2021-04-27T20:13:45.158Z");
    expect(remote.description).not.toMatch(/<[a-z]/i);
  });

  it("uses the salary only when the employer marks it for display", async () => {
    respondWith(fixture("ashby"));
    const { jobs } = await ashbyProvider.fetchJobs({
      key: "ramp",
      name: "Ramp",
    });

    expect(jobs[1]).toMatchObject({
      salaryMin: 211400,
      salaryMax: 290600,
      salaryCurrency: "USD",
      salaryPeriod: "YEAR",
      salaryAnnualMax: 290600,
      locationType: "HYBRID",
    });
    const hidden = jobs.find((j) => j.externalId === "fixture-hidden-comp")!;
    expect(hidden.salaryMin).toBeNull();
    expect(hidden.salaryMax).toBeNull();
  });

  it("keeps an unstated workplace unknown instead of assuming on-site", async () => {
    respondWith(fixture("ashby"));
    const { jobs } = await ashbyProvider.fetchJobs({ key: "x", name: "X" });
    const job = jobs.find((j) => j.externalId === "fixture-no-workplace")!;
    expect(job.location).toBe("Singapore");
    expect(job.locationType).toBeNull();
  });

  it("reports a missing board as a provider error", async () => {
    respondWith({ error: "not found" }, 404);
    await expect(
      ashbyProvider.fetchJobs({ key: "nope", name: "Nope" }),
    ).rejects.toThrow("Board not found (404).");
  });

  it("rejects an unexpected response shape", async () => {
    respondWith({ something: "else" });
    await expect(
      ashbyProvider.fetchJobs({ key: "x", name: "X" }),
    ).rejects.toThrow("Unexpected Ashby response shape.");
  });
});

describe("Greenhouse", () => {
  it("maps jobs from the public board API", async () => {
    const fetchSpy = respondWith(fixture("greenhouse"));
    const { jobs, skipped } = await greenhouseProvider.fetchJobs({
      key: "gitlab",
      name: "GitLab",
    });

    expect(String(fetchSpy.mock.calls[0][0])).toBe(
      "https://boards-api.greenhouse.io/v1/boards/gitlab/jobs?content=true",
    );
    expect(skipped).toBe(1); // empty title
    expect(jobs[0]).toMatchObject({
      provider: "greenhouse",
      externalId: "8556658002",
      title: "AI Engineer",
      company: "GitLab",
      locationType: "REMOTE",
      employmentType: null, // Greenhouse does not publish a contract type
      salaryMin: null,
    });
    expect(jobs[0].postedAt?.toISOString()).toBe("2026-05-22T13:16:29.000Z");
    // HTML-escaped HTML is unescaped and reduced to text.
    expect(jobs[0].description).not.toMatch(/&lt;|<p>|<\/?div/);
  });

  it("splits multi-location strings on bullets without breaking 'City, ST'", async () => {
    respondWith(fixture("greenhouse"));
    const { jobs } = await greenhouseProvider.fetchJobs({
      key: "figma",
      name: "Figma",
    });
    expect(jobs[1].locations).toEqual([
      "San Francisco, CA",
      "New York, NY",
      "United States",
    ]);
    expect(jobs[1].location).toBe("San Francisco, CA");
    expect(jobs[1].locationType).toBeNull();
  });

  it("reads a published 'Workplace Type' field when a board has one", async () => {
    respondWith(fixture("greenhouse"));
    const { jobs } = await greenhouseProvider.fetchJobs({
      key: "airbnb",
      name: "Airbnb",
    });
    expect(jobs[2]).toMatchObject({
      company: "Airbnb",
      locationType: "HYBRID",
    });
  });

  it("carries the application deadline as the expiry", async () => {
    respondWith(fixture("greenhouse"));
    const { jobs } = await greenhouseProvider.fetchJobs({
      key: "gitlab",
      name: "GitLab",
    });
    expect(jobs[3].expiresAt?.getUTCFullYear()).toBe(2020);
  });
});

describe("Lever", () => {
  it("maps postings, their sections and workplace type", async () => {
    const fetchSpy = respondWith(fixture("lever"));
    const { jobs, skipped } = await leverProvider.fetchJobs({
      key: "spotify",
      name: "Spotify",
    });

    expect(String(fetchSpy.mock.calls[0][0])).toBe(
      "https://api.lever.co/v0/postings/spotify?mode=json",
    );
    expect(skipped).toBe(1);
    expect(jobs[0]).toMatchObject({
      provider: "lever",
      externalId: "2193db3f-77c5-43b8-b030-8f92c9882bf1",
      title: "Android Engineer - Experience",
      company: "Spotify",
      locations: ["London", "Stockholm"],
      locationType: "HYBRID",
      employmentType: "FULL_TIME", // "Permanent"
      applyUrl:
        "https://jobs.lever.co/spotify/2193db3f-77c5-43b8-b030-8f92c9882bf1/apply",
    });
    // Lever's "What You'll Do" / "Who You Are" lists become real sections.
    expect(jobs[0].responsibilities.length).toBeGreaterThan(0);
    expect(jobs[0].requirements.length).toBeGreaterThan(0);
    expect(jobs[0].description).toContain("## What You'll Do");
    expect(jobs[1].locationType).toBe("REMOTE");
  });

  it("uses the EU host for eu: sources", async () => {
    const fetchSpy = respondWith([]);
    await leverProvider.fetchJobs({ key: "eu:acme", name: "Acme" });
    expect(String(fetchSpy.mock.calls[0][0])).toBe(
      "https://api.eu.lever.co/v0/postings/acme?mode=json",
    );
  });
});

describe("Adzuna (optional)", () => {
  const sample = {
    results: [
      {
        id: "4001",
        title: "Frontend Developer",
        description: "Build React interfaces for merchants…",
        redirect_url: "https://www.adzuna.sg/land/ad/4001",
        created: "2026-09-01T10:00:00Z",
        company: { display_name: "Example Pte Ltd" },
        location: { display_name: "Singapore" },
        salary_min: 60000,
        salary_max: 84000,
        salary_is_predicted: "0",
        contract_time: "full_time",
      },
      {
        id: "4002",
        title: "Data Analyst",
        description: "…",
        redirect_url: "https://www.adzuna.sg/land/ad/4002",
        company: { display_name: "Another Co" },
        location: { display_name: "Singapore" },
        salary_min: 50000,
        salary_max: 55000,
        salary_is_predicted: "1",
      },
      {
        id: "4003",
        title: "No company",
        redirect_url: "https://www.adzuna.sg/land/ad/4003",
      },
    ],
  };

  it("is off without credentials", async () => {
    expect(adzunaProvider.isConfigured()).toBe(false);
    await expect(
      adzunaProvider.fetchJobs({ key: "sg|developer|", name: "x" }),
    ).rejects.toThrow("not configured");
  });

  it("maps results, marks excerpts, and never shows a predicted salary", async () => {
    vi.stubEnv("ADZUNA_APP_ID", "id");
    vi.stubEnv("ADZUNA_APP_KEY", "key");
    vi.resetModules();
    const { adzunaProvider: fresh } =
      await import("@/server/jobs/providers/adzuna");
    const fetchSpy = respondWith(sample);

    const { jobs, skipped } = await fresh.fetchJobs({
      key: "sg|frontend developer|Singapore",
      name: "x",
    });
    const url = new URL(String(fetchSpy.mock.calls[0][0]));
    expect(url.pathname).toBe("/v1/api/jobs/sg/search/1");
    expect(url.searchParams.get("what")).toBe("frontend developer");
    expect(url.searchParams.get("where")).toBe("Singapore");

    expect(skipped).toBe(1);
    expect(jobs[0]).toMatchObject({
      provider: "adzuna",
      company: "Example Pte Ltd",
      descriptionIsExcerpt: true,
      salaryMin: 60000,
      salaryCurrency: "SGD",
      employmentType: "FULL_TIME",
    });
    expect(jobs[1].salaryMin).toBeNull(); // predicted → not a salary
  });
});

describe("fetchJson", () => {
  it("retries a rate-limited request, then succeeds", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("", { status: 429, headers: { "retry-after": "0" } }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));
    await expect(
      fetchJson("https://example.test", { retries: 2 }),
    ).resolves.toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("gives up after bounded retries on server errors", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response("", { status: 503 }));
    await expect(
      fetchJson("https://example.test", { retries: 1 }),
    ).rejects.toBeInstanceOf(ProviderError);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("does not retry client errors", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response("", { status: 403 }));
    await expect(
      fetchJson("https://example.test", { retries: 2 }),
    ).rejects.toThrow("Provider responded 403.");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("turns a timeout into a provider error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      Object.assign(new Error("t"), { name: "TimeoutError" }),
    );
    await expect(
      fetchJson("https://example.test", { retries: 0, timeoutMs: 5 }),
    ).rejects.toThrow("timed out");
  });

  it("rejects invalid JSON", async () => {
    respondWith("<html>not json</html>");
    await expect(fetchJson("https://example.test")).rejects.toThrow(
      "invalid JSON",
    );
  });
});
