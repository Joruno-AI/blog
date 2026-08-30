import { performance } from "node:perf_hooks";

import { isolatedRequest } from "./isolated-http.mjs";

export const DEFAULT_AGENT_STRESS_ROUTES = [
  "/agent/",
  "/agent/all/",
  "/agent/trending/",
  "/agent/scenes/",
  "/agent/about/",
  "/agent/masters/",
  "/agent/repository/",
  "/agent/analyzer/",
  "/agent/compare/",
  "/agent/openclaw/openclaw/",
  "/agent/anthropics/skills/",
  "/agent/affaan-m/ECC/",
];

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.join("=") || true];
  }),
);

function positiveInteger(value, fallback, name) {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`${name} must be a positive integer.`);
  return number;
}

const baseArg = args.get("base") || process.env.AGENT_STRESS_BASE_URL || process.env.PARITY_CANDIDATE_URL;
if (!baseArg || baseArg === true) {
  throw new Error("Pass --base=https://HOST (or AGENT_STRESS_BASE_URL) to select the deployment under test.");
}

const base = String(baseArg).replace(/\/$/, "");
const requests = positiveInteger(args.get("requests"), 120, "requests");
const concurrency = positiveInteger(args.get("concurrency"), 12, "concurrency");
const warmupRequests = positiveInteger(args.get("warmup"), DEFAULT_AGENT_STRESS_ROUTES.length, "warmup");
const timeoutMs = positiveInteger(args.get("timeout-ms"), 30_000, "timeout-ms");
const attempts = positiveInteger(args.get("attempts"), 1, "attempts");
const expectedStatus = positiveInteger(args.get("expected-status"), 200, "expected-status");
const progressEvery = positiveInteger(args.get("progress-every"), 10, "progress-every");
const cacheBust = args.get("cache-bust") !== "false";
const configuredRoutes = args.get("routes");
const routes = configuredRoutes && configuredRoutes !== true
  ? String(configuredRoutes).split(",").map((route) => route.trim()).filter(Boolean)
  : DEFAULT_AGENT_STRESS_ROUTES;
if (!routes.length || routes.some((route) => !route.startsWith("/agent/"))) {
  throw new Error("routes must contain one or more comma-separated /agent/... paths.");
}

const userAgent = "personal-platform-agent-stress/1.0";
const runId = `${Date.now().toString(36)}-${process.pid}`;
const probeStartedAt = performance.now();

function round(value) {
  return Number(value.toFixed(3));
}

function progress(stage, completed, total) {
  const elapsedSeconds = (performance.now() - probeStartedAt) / 1_000;
  console.error(`[agent-stress +${elapsedSeconds.toFixed(1)}s] ${stage}: ${completed}/${total}`);
}

function targetUrl(route, index, stage) {
  const url = new URL(route, `${base}/`);
  if (cacheBust) url.searchParams.set("__agent_stress", `${runId}-${stage}-${index}`);
  return url.href;
}

async function runOne(route, index, stage) {
  const startedAt = performance.now();
  try {
    const result = await isolatedRequest(targetUrl(route, index, stage), {
      attempts,
      timeoutMs,
      headers: { "User-Agent": userAgent },
      retryBaseDelayMs: 100,
    });
    return {
      route,
      status: result.response.status,
      bytes: result.body.length,
      durationMs: result.timings.totalDurationMs,
      ttfbMs: result.timings.ttfbMs,
      attempt: result.attempt,
      error: null,
    };
  } catch (error) {
    return {
      route,
      status: null,
      bytes: 0,
      durationMs: performance.now() - startedAt,
      ttfbMs: null,
      attempt: attempts,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runConcurrent(total, stage) {
  const output = new Array(total);
  let cursor = 0;
  let completed = 0;
  progress(stage, 0, total);
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, async () => {
    while (cursor < total) {
      const index = cursor++;
      const route = routes[index % routes.length];
      output[index] = await runOne(route, index, stage);
      completed += 1;
      if (completed === total || completed % progressEvery === 0) progress(stage, completed, total);
    }
  }));
  return output;
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return round(sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]);
}

function latencySummary(values) {
  if (!values.length) return null;
  return {
    min: round(Math.min(...values)),
    mean: round(values.reduce((sum, value) => sum + value, 0) / values.length),
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    p99: percentile(values, 0.99),
    max: round(Math.max(...values)),
  };
}

function summarize(results, durationMs) {
  const statusCounts = {};
  for (const result of results) {
    const key = result.status === null ? "NETWORK_ERROR" : String(result.status);
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  }
  const failures = results.filter((result) => result.status !== expectedStatus);
  const perRoute = Object.fromEntries(routes.map((route) => {
    const matching = results.filter((result) => result.route === route);
    const matchingFailures = matching.filter((result) => result.status !== expectedStatus);
    return [route, {
      requests: matching.length,
      failures: matchingFailures.length,
      statuses: Object.fromEntries([...new Set(matching.map((result) => result.status === null ? "NETWORK_ERROR" : String(result.status)))]
        .map((status) => [status, matching.filter((result) => (result.status === null ? "NETWORK_ERROR" : String(result.status)) === status).length])),
      durationMs: latencySummary(matching.map((result) => result.durationMs)),
    }];
  }));
  return {
    requests: results.length,
    successes: results.length - failures.length,
    failures: failures.length,
    statusCounts,
    totalBytes: results.reduce((sum, result) => sum + result.bytes, 0),
    wallDurationMs: round(durationMs),
    throughputRequestsPerSecond: round(results.length / (durationMs / 1_000)),
    durationMs: latencySummary(results.map((result) => result.durationMs)),
    ttfbMs: latencySummary(results.flatMap((result) => result.ttfbMs === null ? [] : [result.ttfbMs])),
    maximumAttempt: Math.max(...results.map((result) => result.attempt)),
    errorSamples: failures.slice(0, 20).map(({ route, status, durationMs, error }) => ({
      route,
      status,
      durationMs: round(durationMs),
      error,
    })),
    perRoute,
  };
}

const warmupStartedAt = performance.now();
const warmupResults = await runConcurrent(warmupRequests, "warmup");
const warmupDurationMs = performance.now() - warmupStartedAt;
const measuredStartedAt = performance.now();
const measuredResults = await runConcurrent(requests, "measured");
const measuredDurationMs = performance.now() - measuredStartedAt;
const measured = summarize(measuredResults, measuredDurationMs);
const report = {
  base,
  generatedAt: new Date().toISOString(),
  configuration: {
    routes,
    requests,
    concurrency,
    warmupRequests,
    timeoutMs,
    attempts,
    expectedStatus,
    cacheBust,
    freshSocketPerAttempt: true,
  },
  warmup: summarize(warmupResults, warmupDurationMs),
  measured,
};

console.log(JSON.stringify(report, null, 2));
if (measured.failures) process.exitCode = 1;
