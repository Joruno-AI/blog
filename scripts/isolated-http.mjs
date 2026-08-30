import http from "node:http";
import https from "node:https";
import { performance } from "node:perf_hooks";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const DEFAULT_RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function headerValue(headers, name) {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value.join(", ") : value ?? null;
}

function responseContract(response, url) {
  const status = response.statusCode || 0;
  return {
    status,
    ok: status >= 200 && status < 300,
    url,
    headers: {
      get(name) {
        return headerValue(response.headers, name);
      },
    },
  };
}

/**
 * Perform one HTTP/1.1 request on a one-use socket.
 *
 * Node's global fetch dispatcher deliberately pools connections. That is a
 * poor fit for a multi-thousand-request deployment audit: a retired proxy or
 * keep-alive socket can poison several retries in the same pool. `agent:
 * false` creates a fresh socket for every attempt and `Connection: close`
 * prevents either peer from retaining it afterwards.
 */
export function isolatedRequestOnce(url, options = {}) {
  const target = new URL(url);
  const transport = target.protocol === "https:" ? https : target.protocol === "http:" ? http : null;
  if (!transport) throw new Error(`Unsupported URL protocol: ${target.protocol}`);

  const timeoutMs = Math.max(1, Number(options.timeoutMs || 30_000));
  const startedAt = performance.now();

  return new Promise((resolve, reject) => {
    let settled = false;
    let firstByteAt = null;
    let timer;
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };
    const request = transport.request(target, {
      method: options.method || "GET",
      agent: false,
      headers: {
        "Accept-Encoding": "identity",
        Connection: "close",
        ...options.headers,
      },
    }, (response) => {
      firstByteAt = performance.now();
      const chunks = [];
      response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      response.on("end", () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const endedAt = performance.now();
        resolve({
          response: responseContract(response, target.href),
          body: Buffer.concat(chunks),
          timings: {
            durationMs: endedAt - startedAt,
            ttfbMs: (firstByteAt ?? endedAt) - startedAt,
          },
        });
      });
      response.on("aborted", () => {
        const error = new Error(`Response aborted for ${target.href}`);
        fail(error);
        request.destroy(error);
      });
      response.on("error", fail);
    });

    timer = setTimeout(() => {
      request.destroy(new Error(`Timed out after ${timeoutMs} ms: ${target.href}`));
    }, timeoutMs);
    timer.unref?.();

    request.on("error", fail);
    request.end(options.body);
  });
}

async function requestFollowingRedirects(url, options) {
  const redirect = options.redirect || "follow";
  const maximumRedirects = Math.max(0, Number(options.maximumRedirects ?? 10));
  let currentUrl = String(url);
  let redirects = 0;
  let totalDurationMs = 0;

  while (true) {
    const result = await isolatedRequestOnce(currentUrl, options);
    totalDurationMs += result.timings.durationMs;
    const location = result.response.headers.get("location");
    if (redirect !== "follow" || !location || !REDIRECT_STATUSES.has(result.response.status)) {
      return {
        ...result,
        redirects,
        timings: { ...result.timings, totalDurationMs },
      };
    }
    if (redirects >= maximumRedirects) {
      throw new Error(`Exceeded ${maximumRedirects} redirects while requesting ${url}`);
    }
    currentUrl = new URL(location, currentUrl).href;
    redirects += 1;
  }
}

/**
 * Request with bounded transient retries. Every retry starts from the original
 * URL and receives a brand-new socket; it never re-enters a failed keep-alive
 * pool.
 */
export async function isolatedRequest(url, options = {}) {
  const retryableStatuses = options.retryableStatuses || DEFAULT_RETRYABLE_STATUSES;
  const attempts = Math.max(1, Number(options.attempts || 5));
  const retryBaseDelayMs = Math.max(0, Number(options.retryBaseDelayMs ?? 100));
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await requestFollowingRedirects(url, options);
      result.attempt = attempt;
      if (!retryableStatuses.has(result.response.status) || attempt === attempts) return result;
      lastError = new Error(`${url} returned transient HTTP ${result.response.status}`);
      options.onRetry?.({ attempt, attempts, error: lastError, status: result.response.status, url: String(url) });
    } catch (error) {
      lastError = error;
      if (attempt === attempts) throw error;
      options.onRetry?.({ attempt, attempts, error, status: null, url: String(url) });
    }

    const backoff = Math.min(2_000, retryBaseDelayMs * 2 ** (attempt - 1));
    if (backoff) await sleep(backoff);
  }

  throw lastError;
}
