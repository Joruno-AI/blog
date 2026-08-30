import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { parseAgentRepositoryAllowlist } from "../lib/agent/repository-access";
import { fetchWithTimeout, readLimitedText, UpstreamResponseTooLargeError } from "../lib/agent/upstream";
import { agentRateLimitResponse } from "../lib/platform/agent-rate-limit";

test("the upstream allowlist is derived from every exact Astro Agent repository", () => {
  const payload = JSON.parse(readFileSync("lib/parity/data/agent-suggest-index.json", "utf8")) as {
    items: Array<{ f: string }>;
  };
  const source = `${payload.items.map((item) => item.f.toLowerCase()).join("\n")}\n`;
  const allowlist = parseAgentRepositoryAllowlist(source);
  assert.equal(allowlist.size, 28_868);
  assert.equal(allowlist.has("openclaw/openclaw"), true);
  assert.equal(allowlist.has("private-owner/private-repository"), false);
  assert.throws(() => parseAgentRepositoryAllowlist("owner/repo\n"), /incomplete/);
});

test("anonymous Agent proxies never attach the CMS GitHub token or expose contents", () => {
  const github = readFileSync("app/api/agent/github/[...path]/route.ts", "utf8");
  const publicGithub = readFileSync("lib/agent/github-public.ts", "utf8");
  assert.doesNotMatch(`${github}\n${publicGithub}`, /GITHUB_TOKEN|Authorization|action === "contents"/);
  assert.match(github, /isAgentRepositoryAllowed/);
  assert.match(github, /cachedAgentResponse/);
  assert.match(github, /fetchPublicGithubJson\(treePath, \{ recursive: "1" \}\)/);
  assert.match(github, /fetchPublicGithubJson\(treePath, \{\}, 1_000_000\)/);
  assert.match(github, /probeRawRepositoryRoot/);
  assert.match(publicGithub, /readLimitedText\(response, maximumBytes\)/);
  assert.match(github, /slice\(0, 5_000\)/);

  const zreadRoute = readFileSync("app/api/zread/[...path]/route.ts", "utf8");
  assert.match(zreadRoute, /isAgentRepositoryAllowed/);
  assert.match(zreadRoute, /fetchZReadStructure\(owner, repo, request\.signal\)/);
  assert.match(zreadRoute, /fetchZReadPage\(owner, repo, requested, request\.signal\)/);
  assert.equal(existsSync("app/api/deepwiki/[...path]/route.ts"), false);
});

test("limited response reads stop before retaining an oversized upstream body", async () => {
  const response = new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(8));
      controller.enqueue(new Uint8Array(8));
      controller.close();
    },
  }));
  await assert.rejects(() => readLimitedText(response, 12), UpstreamResponseTooLargeError);
});

test("caller cancellation reaches an in-flight timed upstream request", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamWasAborted = false;
  globalThis.fetch = ((_: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_, reject) => {
    const upstreamSignal = init?.signal;
    const rejectAbort = () => {
      upstreamWasAborted = Boolean(upstreamSignal?.aborted);
      reject(new DOMException("aborted", "AbortError"));
    };
    if (upstreamSignal?.aborted) rejectAbort();
    else upstreamSignal?.addEventListener("abort", rejectAbort, { once: true });
  })) as typeof fetch;
  try {
    const controller = new AbortController();
    const pending = fetchWithTimeout("https://example.test/upstream", { signal: controller.signal }, 60_000);
    controller.abort();
    await assert.rejects(pending, (reason: unknown) => reason instanceof Error && reason.name === "AbortError");
    assert.equal(upstreamWasAborted, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("the Worker limiter rejects exhausted Agent API budgets only", async () => {
  let key = "";
  const exhausted = {
    AGENT_RATE_LIMITER: {
      async limit(input: { key: string }) {
        key = input.key;
        return { success: false };
      },
    },
  };
  const limited = await agentRateLimitResponse(new Request("https://example.test/api/zread/openclaw/openclaw/overview", {
    headers: { "cf-connecting-ip": "192.0.2.4" },
  }), exhausted);
  assert.equal(limited?.status, 429);
  assert.equal(limited?.headers.get("retry-after"), "60");
  assert.equal(key, "192.0.2.4:zread");

  assert.equal(await agentRateLimitResponse(new Request("https://example.test/blog/"), exhausted), null);
});

test("production and review Workers both configure independent Agent limiters", () => {
  const config = readFileSync("wrangler.toml", "utf8");
  assert.match(config, /\[\[ratelimits\]\][\s\S]*?namespace_id = "1710642275"[\s\S]*?limit = 90/);
  assert.match(config, /\[\[env\.review\.ratelimits\]\][\s\S]*?namespace_id = "1710642276"[\s\S]*?limit = 90/);
});
