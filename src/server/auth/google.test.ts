import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  buildAuthorizationUrl,
  checkClaims,
  createAuthorizationSecrets,
  exchangeCode,
  googleRedirectUri,
  verifyIdToken,
} from "@/server/auth/google";

/**
 * Google is replaced by a local RSA key and a mocked fetch: the tokens below
 * are genuinely signed and genuinely verified, only the network is fake.
 * Env values come from vitest.config.mts (client id, APP_URL).
 */

const CLIENT_ID = "test-client.apps.googleusercontent.com";
const NOW = 1_800_000_000_000;
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const jwk = {
  ...publicKey.export({ format: "jwk" }),
  kid: "test-kid",
  alg: "RS256",
  use: "sig",
};

const b64 = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

function makeToken(
  claims: Record<string, unknown> = {},
  { kid = "test-kid", key = privateKey, alg = "RS256" } = {},
) {
  const header = b64({ alg, kid, typ: "JWT" });
  const payload = b64({
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub: "google-sub-123",
    email: "Person@Example.com",
    email_verified: true,
    name: "Pat Person",
    nonce: "nonce-1",
    iat: NOW / 1000 - 10,
    exp: NOW / 1000 + 3600,
    ...claims,
  });
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(`${header}.${payload}`),
    key,
  );
  return `${header}.${payload}.${signature.toString("base64url")}`;
}

function mockGoogle({ token = "", tokenStatus = 200 } = {}) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/oauth2/v3/certs")) {
      return new Response(JSON.stringify({ keys: [jwk] }), {
        headers: { "cache-control": "public, max-age=100" },
      });
    }
    if (url.includes("oauth2.googleapis.com/token")) {
      return new Response(
        JSON.stringify(
          tokenStatus === 200
            ? { id_token: token }
            : { error: "invalid_grant" },
        ),
        { status: tokenStatus },
      );
    }
    throw new Error(`unexpected fetch ${url}`);
  });
}

afterEach(() => vi.restoreAllMocks());

beforeAll(() => {
  vi.setSystemTime(NOW);
});

describe("authorization request", () => {
  it("uses the fixed callback on APP_URL", () => {
    expect(googleRedirectUri()).toBe(
      "https://elara.test/api/auth/google/callback",
    );
  });

  it("sends state, nonce and an S256 PKCE challenge of the verifier", () => {
    const secrets = createAuthorizationSecrets();
    const url = new URL(buildAuthorizationUrl(secrets));

    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(url.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(url.searchParams.get("redirect_uri")).toBe(googleRedirectUri());
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe(secrets.state);
    expect(url.searchParams.get("nonce")).toBe(secrets.nonce);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe(
      createHash("sha256").update(secrets.codeVerifier).digest("base64url"),
    );
    // The secret never goes to the browser.
    expect(url.toString()).not.toContain("test-client-secret");
  });

  it("makes fresh secrets per attempt, with a valid PKCE verifier length", () => {
    const a = createAuthorizationSecrets();
    const b = createAuthorizationSecrets();
    expect(a.state).not.toBe(b.state);
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(a.codeVerifier.length).toBeLessThanOrEqual(128);
  });
});

describe("exchangeCode", () => {
  it("posts the code with the PKCE verifier and client secret", async () => {
    const fetchSpy = mockGoogle({ token: "the-id-token" });
    await expect(exchangeCode("auth-code", "verifier-1")).resolves.toBe(
      "the-id-token",
    );

    const [, init] = fetchSpy.mock.calls[0];
    const body = new URLSearchParams(String(init?.body));
    expect(body.get("code")).toBe("auth-code");
    expect(body.get("code_verifier")).toBe("verifier-1");
    expect(body.get("client_secret")).toBe("test-client-secret");
    expect(body.get("redirect_uri")).toBe(googleRedirectUri());
    expect(body.get("grant_type")).toBe("authorization_code");
  });

  it("fails with the OAuth error code, not the response body", async () => {
    mockGoogle({ tokenStatus: 400 });
    await expect(exchangeCode("bad", "v")).rejects.toThrow(
      "Token exchange failed (400 invalid_grant).",
    );
  });
});

describe("verifyIdToken", () => {
  it("accepts a valid token and normalises the email", async () => {
    mockGoogle();
    await expect(verifyIdToken(makeToken(), "nonce-1", NOW)).resolves.toEqual({
      sub: "google-sub-123",
      email: "person@example.com",
      emailVerified: true,
      name: "Pat Person",
    });
  });

  it("rejects a token signed by another key", async () => {
    mockGoogle();
    const { privateKey: other } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    await expect(
      verifyIdToken(makeToken({}, { key: other }), "nonce-1", NOW),
    ).rejects.toThrow("signature is invalid");
  });

  it("rejects a tampered payload", async () => {
    mockGoogle();
    const [h, , s] = makeToken().split(".");
    const forged = b64({
      iss: "https://accounts.google.com",
      aud: CLIENT_ID,
      sub: "attacker",
      email: "a@b.c",
      nonce: "nonce-1",
      exp: NOW / 1000 + 60,
    });
    await expect(
      verifyIdToken(`${h}.${forged}.${s}`, "nonce-1", NOW),
    ).rejects.toThrow("signature is invalid");
  });

  it("rejects an unknown key id and a non-RS256 algorithm", async () => {
    mockGoogle();
    await expect(
      verifyIdToken(makeToken({}, { kid: "nope" }), "nonce-1", NOW),
    ).rejects.toThrow("unknown key");
    await expect(
      verifyIdToken(makeToken({}, { alg: "none" }), "nonce-1", NOW),
    ).rejects.toThrow("algorithm");
  });

  it("rejects a malformed token", async () => {
    await expect(verifyIdToken("not.a", "nonce-1", NOW)).rejects.toThrow(
      "Malformed",
    );
  });
});

describe("checkClaims", () => {
  const base = {
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    sub: "sub-1",
    email: "a@example.com",
    email_verified: true,
    nonce: "n",
    exp: NOW / 1000 + 60,
    iat: NOW / 1000 - 1,
  };

  it.each([
    ["wrong issuer", { iss: "https://evil.example" }, "issuer"],
    ["another client's token", { aud: "someone-else" }, "different client"],
    ["missing audience", { aud: undefined }, "different client"],
    ["expired", { exp: NOW / 1000 - 3600 }, "expired"],
    ["issued in the future", { iat: NOW / 1000 + 3600 }, "future"],
    ["wrong nonce (replay)", { nonce: "other" }, "nonce"],
    ["no nonce", { nonce: undefined }, "nonce"],
    ["no subject", { sub: "" }, "subject"],
    ["no email", { email: undefined }, "email"],
  ])("rejects %s", (_label, override, message) => {
    expect(() => checkClaims({ ...base, ...override }, "n", NOW)).toThrow(
      message,
    );
  });

  it("accepts the bare issuer form and an audience array", () => {
    expect(
      checkClaims(
        { ...base, iss: "accounts.google.com", aud: ["x", CLIENT_ID] },
        "n",
        NOW,
      ).sub,
    ).toBe("sub-1");
  });

  it("reports an unverified email as unverified", () => {
    expect(
      checkClaims({ ...base, email_verified: false }, "n", NOW).emailVerified,
    ).toBe(false);
    expect(
      checkClaims({ ...base, email_verified: undefined }, "n", NOW)
        .emailVerified,
    ).toBe(false);
  });
});
