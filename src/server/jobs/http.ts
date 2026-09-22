import "server-only";

/**
 * Outbound requests to job providers.
 *
 * Every call has a timeout and a size cap. Rate limits (429) and server errors
 * (5xx) are retried a bounded number of times with backoff, honouring
 * Retry-After; client errors (4xx) are not retried, because asking again will
 * not change the answer.
 */

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

type Options = {
  timeoutMs?: number;
  retries?: number;
  /** Refuse bodies larger than this (bytes). */
  maxBytes?: number;
  headers?: Record<string, string>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchJson(
  url: string,
  options: Options = {},
): Promise<unknown> {
  const {
    timeoutMs = 20_000,
    retries = 2,
    maxBytes = 30_000_000,
    headers,
  } = options;
  let attempt = 0;

  for (;;) {
    attempt += 1;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "ELARA job discovery",
          ...headers,
        },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (error) {
      if (attempt <= retries) {
        await sleep(500 * 2 ** (attempt - 1));
        continue;
      }
      const reason =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError")
          ? `timed out after ${timeoutMs / 1000}s`
          : "network error";
      throw new ProviderError(`Request failed: ${reason}.`);
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt <= retries) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const wait =
          Number.isFinite(retryAfter) && retryAfter > 0
            ? Math.min(retryAfter * 1000, 10_000)
            : 500 * 2 ** (attempt - 1);
        await response.body?.cancel().catch(() => undefined);
        await sleep(wait);
        continue;
      }
    }

    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new ProviderError(
        response.status === 404
          ? "Board not found (404)."
          : response.status === 429
            ? "Rate limited by the provider (429)."
            : `Provider responded ${response.status}.`,
        response.status,
      );
    }

    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > maxBytes) {
      await response.body?.cancel().catch(() => undefined);
      throw new ProviderError(`Response too large (${length} bytes).`);
    }

    const text = await response.text();
    if (text.length > maxBytes) throw new ProviderError("Response too large.");
    try {
      return JSON.parse(text);
    } catch {
      throw new ProviderError("Provider returned invalid JSON.");
    }
  }
}
