import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * The suite covers ELARA's pure domain logic — the projection from profile to
 * resume, completion scoring, skill matching, formatting and the PDF's text
 * folding. These are the parts where a silent mistake would put something wrong
 * on someone's resume, and they are all pure functions, so they need no
 * database and no browser.
 *
 * Pages and server actions are exercised against the running app instead; that
 * is integration territory, not unit territory.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
