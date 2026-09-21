import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * The suite covers ELARA's pure domain logic — the projection from profile to
 * resume, completion scoring, skill matching, formatting and the PDF's text
 * folding. These are the parts where a silent mistake would put something wrong
 * on someone's resume, and they are all pure functions, so they need no
 * database and no browser.
 *
 * The auth protocol code (Google OAuth: state, PKCE, ID token verification,
 * account linking) is tested here too, against a mocked network and database.
 *
 * Pages and server actions are exercised against the running app instead; that
 * is integration territory, not unit territory.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Fixed, fake values so server modules that validate their environment
    // (src/lib/env.ts) can be imported. No test talks to a real service.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      APP_URL: "https://elara.test",
      AUTH_SECRET: "test-secret-test-secret-test-secret-00",
      GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./src/test/server-only.ts", import.meta.url),
      ),
    },
  },
});
