import "server-only";
import { z } from "zod";

/**
 * Server environment. Importing this from a client component is a build error
 * (see "server-only"), which is what keeps secrets out of the browser bundle.
 *
 * Only DATABASE_URL, APP_URL and AUTH_SECRET are required. Every integration is
 * optional so the product runs end-to-end on a fresh clone: without GEMINI_API_KEY
 * the assistant reports that it is not configured, and without RESEND_API_KEY
 * outbound email is written to the server log instead of being delivered.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),

  // The model is not configured here: it is pinned in code, in one place
  // (src/server/ai/gemini.ts), because prompts are tuned against it.
  GEMINI_API_KEY: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("ELARA <onboarding@resend.dev>"),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

function read() {
  const parsed = schema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    APP_URL: emptyToUndefined(process.env.APP_URL) ?? vercelUrl(),
    AUTH_SECRET: process.env.AUTH_SECRET,
    GEMINI_API_KEY: emptyToUndefined(process.env.GEMINI_API_KEY),
    RESEND_API_KEY: emptyToUndefined(process.env.RESEND_API_KEY),
    EMAIL_FROM: emptyToUndefined(process.env.EMAIL_FROM),
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nCopy .env.example to .env and fill it in.`,
    );
  }

  return parsed.data;
}

/**
 * On Vercel, fall back to the project's production domain, which the platform
 * sets on every deployment. Email links then never point at localhost just
 * because APP_URL was left out of the project settings.
 */
function vercelUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}` : undefined;
}

function emptyToUndefined(value: string | undefined) {
  return value && value.trim().length > 0 ? value : undefined;
}

export const env = read();

export const isAiConfigured = Boolean(env.GEMINI_API_KEY);
export const isEmailConfigured = Boolean(env.RESEND_API_KEY);
