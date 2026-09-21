import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";

import { env } from "@/lib/env";

/**
 * The Gemini provider. This is the only module that knows which vendor ELARA
 * uses; AiService talks to it through `generateJson` and nothing else.
 *
 * Runs server-side only ("server-only" makes a client import a build error),
 * so GEMINI_API_KEY never reaches the browser.
 */

/**
 * Model selection, in one place. Every assistant task uses these.
 *
 * Primary — Gemini 3.5 Flash-Lite: a stable (non-preview) release in the
 * cheapest tier, and good at what ELARA asks of it: careful rewriting, short
 * structured analysis, and keeping to "do not add facts". Pinned to an exact
 * name rather than a `-latest` alias so a silent upgrade cannot change
 * behaviour under prompts tuned against this one.
 *
 * Fallback — Gemini 3.5 Flash: used only when the primary is overloaded, rate
 * limited or timing out (after its retry), so a demand spike on one model does
 * not take the assistant down.
 */
export const AI_MODEL = "gemini-3.5-flash-lite";
export const AI_FALLBACK_MODEL = "gemini-3.5-flash";

/** Statuses that mean "this model is busy", not "this request is wrong". */
const CAPACITY_STATUSES = new Set([429, 500, 503, 504]);

/**
 * Time budget for one assistant request, primary and fallback together.
 *
 * Pages that call the assistant set `maxDuration = 60` (the most every Vercel
 * plan allows), so the whole exchange must finish inside that with room to
 * spare. The SDK also sends each call's timeout to Google as its server-side
 * deadline (X-Server-Timeout), so a timeout must cover a slow answer, not a
 * typical one: under load, short answers have been measured at 12 to 38s.
 */
const TOTAL_BUDGET_MS = 55_000;
/** The primary's share. What is left, if enough, goes to the fallback. */
const PRIMARY_TIMEOUT_MS = 40_000;
/** Below this a fallback could not finish (and Google rejects deadlines under 10s). */
const MIN_FALLBACK_MS = 12_000;

const client = env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: env.GEMINI_API_KEY,
      httpOptions: {
        // Quick retry only for failures that come back fast (overloaded, rate
        // limited). A timeout is not retried on the same model: the fallback
        // model is the better second attempt.
        retryOptions: {
          attempts: 2,
          initialDelay: 1,
          maxDelay: 2,
          httpStatusCodes: [429, 503],
        },
      },
    })
  : null;

export type GenerateResult = {
  text: string;
  /** The model that actually answered. */
  model: string;
  inputTokens: number;
  outputTokens: number;
};

/** A provider failure the caller can report without leaking provider detail. */
export class AiProviderError extends Error {
  constructor(
    message: string,
    /** HTTP status from the provider, when there was one. */
    readonly status?: number,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

type Request = { system: string; prompt: string; temperature: number };

/**
 * One request, one JSON document back — from the primary model, or from the
 * fallback when the primary is out of capacity.
 *
 * JSON mode is requested from the API, but the text is still only *text*: the
 * caller parses and validates it, and nothing here trusts its shape.
 */
export async function generateJson(request: Request): Promise<GenerateResult> {
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  try {
    return await generateWith(AI_MODEL, request, PRIMARY_TIMEOUT_MS);
  } catch (error) {
    const remaining = deadline - Date.now();
    if (
      error instanceof AiProviderError &&
      error.status !== undefined &&
      CAPACITY_STATUSES.has(error.status) &&
      remaining >= MIN_FALLBACK_MS
    ) {
      console.warn(
        JSON.stringify({
          level: "warn",
          context: "gemini",
          message: `${AI_MODEL} unavailable (${error.status}); using ${AI_FALLBACK_MODEL}`,
        }),
      );
      return generateWith(AI_FALLBACK_MODEL, request, remaining);
    }
    throw error;
  }
}

/** One model call, timed. The log line carries no prompt or output text. */
async function generateWith(
  model: string,
  request: Request,
  timeoutMs: number,
): Promise<GenerateResult> {
  const started = Date.now();
  let outcome = "error";
  try {
    const result = await callModel(model, request, timeoutMs);
    outcome = "ok";
    return result;
  } catch (error) {
    if (error instanceof AiProviderError && error.status) {
      outcome = String(error.status);
    }
    throw error;
  } finally {
    console.info(
      JSON.stringify({
        level: "info",
        context: "gemini",
        model,
        outcome,
        ms: Date.now() - started,
      }),
    );
  }
}

async function callModel(
  model: string,
  { system, prompt, temperature }: Request,
  timeoutMs: number,
): Promise<GenerateResult> {
  if (!client) throw new AiProviderError("Gemini is not configured.");

  let response;
  try {
    response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        httpOptions: { timeout: timeoutMs },
        systemInstruction: system,
        temperature,
        responseMimeType: "application/json",
        maxOutputTokens: 4096,
        // Editing, not reasoning: a little thinking helps it respect the
        // constraints, a lot only adds latency and cost.
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw new AiProviderError(
        `Gemini (${model}) request failed with status ${error.status}${reasonOf(error.message)}.`,
        error.status,
      );
    }
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      // Our own per-attempt timeout. Treated like a gateway timeout, so a
      // hung primary falls back rather than failing outright.
      throw new AiProviderError(
        `Gemini (${model}) did not answer within ${Math.round(timeoutMs / 1000)}s.`,
        504,
      );
    }
    throw error;
  }

  const usage = response.usageMetadata;
  const inputTokens = usage?.promptTokenCount ?? 0;
  const outputTokens =
    (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0);

  const blocked = response.promptFeedback?.blockReason;
  if (blocked) {
    throw new AiProviderError(`Gemini blocked the prompt (${blocked}).`);
  }

  const candidate = response.candidates?.[0];
  const text = response.text;

  if (!text) {
    throw new AiProviderError(
      `Gemini returned no text (finish reason: ${candidate?.finishReason ?? "none"}).`,
    );
  }

  if (candidate?.finishReason && candidate.finishReason !== "STOP") {
    // MAX_TOKENS in particular leaves truncated JSON behind.
    throw new AiProviderError(
      `Gemini stopped early (finish reason: ${candidate.finishReason}).`,
    );
  }

  return { text, model, inputTokens, outputTokens };
}

/**
 * Google's own status and message from an API error body ("UNAVAILABLE: The
 * model is overloaded"), for the log. Only those two fields are kept.
 */
function reasonOf(message: string) {
  const status = message.match(/"status":\s*"([A-Z_]+)"/)?.[1];
  const detail = message.match(/"message":\s*"([^"]{1,200})/)?.[1];
  return status || detail
    ? ` (${[status, detail].filter(Boolean).join(": ")})`
    : "";
}
