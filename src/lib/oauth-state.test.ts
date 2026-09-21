import { describe, expect, it } from "vitest";

import {
  OAUTH_STATE_TTL_MS,
  openOAuthState,
  safeReturnTo,
  sealOAuthState,
  statesMatch,
  type OAuthState,
} from "@/lib/oauth-state";

const SECRET = "a-test-secret-that-is-long-enough-000";
const now = 1_800_000_000_000;
const value: OAuthState = {
  state: "state-abc",
  nonce: "nonce-abc",
  codeVerifier: "verifier-abc",
  returnTo: "/resume",
  issuedAt: now,
};

describe("sealOAuthState / openOAuthState", () => {
  it("round-trips a value", () => {
    expect(openOAuthState(sealOAuthState(value, SECRET), SECRET, now)).toEqual(
      value,
    );
  });

  it("rejects a value signed with another secret", () => {
    const sealed = sealOAuthState(value, "some-other-secret-that-is-long-00");
    expect(openOAuthState(sealed, SECRET, now)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const sealed = sealOAuthState(value, SECRET);
    const [payload, signature] = sealed.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...value, returnTo: "/settings" }),
    ).toString("base64url");
    expect(openOAuthState(`${forged}.${signature}`, SECRET, now)).toBeNull();
    expect(openOAuthState(`${payload}.x${signature}`, SECRET, now)).toBeNull();
  });

  it("expires after the TTL", () => {
    const sealed = sealOAuthState(value, SECRET);
    expect(
      openOAuthState(sealed, SECRET, now + OAUTH_STATE_TTL_MS - 1),
    ).not.toBeNull();
    expect(
      openOAuthState(sealed, SECRET, now + OAUTH_STATE_TTL_MS + 1),
    ).toBeNull();
  });

  it("rejects missing and malformed cookies", () => {
    expect(openOAuthState(undefined, SECRET, now)).toBeNull();
    expect(openOAuthState("", SECRET, now)).toBeNull();
    expect(openOAuthState("no-signature", SECRET, now)).toBeNull();
  });

  it("re-sanitises the stored return path", () => {
    const sealed = sealOAuthState(
      { ...value, returnTo: "//evil.example" },
      SECRET,
    );
    expect(openOAuthState(sealed, SECRET, now)?.returnTo).toBe("/dashboard");
  });
});

describe("statesMatch", () => {
  it("matches only identical values", () => {
    expect(statesMatch("abc", "abc")).toBe(true);
    expect(statesMatch("abd", "abc")).toBe(false);
    expect(statesMatch("ab", "abc")).toBe(false);
    expect(statesMatch(null, "abc")).toBe(false);
  });
});

describe("safeReturnTo", () => {
  it("keeps internal paths, with query and hash", () => {
    expect(safeReturnTo("/resume/abc?tab=design#top")).toBe(
      "/resume/abc?tab=design#top",
    );
    expect(safeReturnTo("/jobs")).toBe("/jobs");
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "evil.example",
    "/path\nwith-newline",
    "",
    null,
    undefined,
    42,
  ])("falls back to the dashboard for %j", (input) => {
    expect(safeReturnTo(input)).toBe("/dashboard");
  });

  it("does not return to the sign-in pages", () => {
    expect(safeReturnTo("/login")).toBe("/dashboard");
    expect(safeReturnTo("/register?x=1")).toBe("/dashboard");
    expect(safeReturnTo("/api/auth/google/callback")).toBe("/dashboard");
  });
});
