import assert from "node:assert/strict";
import test from "node:test";

import {
  fallbackRepositoryOverview,
  fetchPublicGithubJson,
  probeRawRepositoryRoot,
  PublicGithubApiError,
} from "../lib/agent/github-public";
import { cachedAgentResponse } from "../lib/agent/platform-cache";

test("selected Agent metadata supplies an anonymous overview fallback", () => {
  const openclaw = fallbackRepositoryOverview("OPENCLAW", "OPENCLAW");
  assert.equal(openclaw.full_name, "openclaw/openclaw");
  assert.equal(openclaw.owner.login, "openclaw");
  assert.equal(openclaw.name, "OPENCLAW");
  assert.equal(openclaw.language, "TypeScript");
  assert.equal(openclaw.default_branch, "HEAD");
  assert.ok(openclaw.stargazers_count > 300_000);
  assert.match(openclaw.description, /个人 AI 助理/);

  const generic = fallbackRepositoryOverview("owner", "repository");
  assert.equal(generic.full_name, "owner/repository");
  assert.equal(generic.stargazers_count, 0);
  assert.equal(generic.default_branch, "HEAD");
});

test("public GitHub requests never attach a private credential", async () => {
  const originalFetch = globalThis.fetch;
  let received: { url: string; init?: RequestInit } | undefined;
  globalThis.fetch = (async (input, init) => {
    received = { url: String(input), init };
    return new Response('{"message":"rate limited"}', { status: 403 });
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => fetchPublicGithubJson("/repos/openclaw/openclaw"),
      (reason: unknown) => reason instanceof PublicGithubApiError && reason.status === 403,
    );
    assert.equal(received?.url, "https://api.github.com/repos/openclaw/openclaw");
    const headers = new Headers(received?.init?.headers);
    assert.equal(headers.has("authorization"), false);
    assert.equal(headers.get("user-agent"), "wangshengliang-blog-repository-reader");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("raw root probing returns a bounded useful tree outside the REST quota", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string | undefined }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requests.push({ url, method: init?.method });
    if (url.endsWith("/README.md")) return new Response(null, { status: 200, headers: { "content-length": "1200" } });
    if (url.endsWith("/package.json")) return new Response(null, { status: 200, headers: { "content-length": "640" } });
    return new Response(null, { status: 404 });
  }) as typeof fetch;
  try {
    const tree = await probeRawRepositoryRoot("openclaw", "openclaw", "HEAD");
    assert.deepEqual(tree, [
      { path: "README.md", type: "blob", size: 1200 },
      { path: "package.json", type: "blob", size: 640 },
    ]);
    assert.equal(requests.length, 10);
    assert.equal(requests.every((request) => request.method === "HEAD"), true);
    assert.equal(requests.every((request) => request.url.includes("/openclaw/openclaw/HEAD/")), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Agent response cache coalesces concurrent cold requests and tolerates cache failures", async () => {
  const originalCaches = Object.getOwnPropertyDescriptor(globalThis, "caches");
  let builds = 0;
  let puts = 0;
  const cache = {
    async match() {
      throw new Error("transient cache read");
    },
    async put() {
      puts += 1;
      throw new Error("transient cache write");
    },
  };
  Object.defineProperty(globalThis, "caches", {
    configurable: true,
    value: { default: cache },
  });
  try {
    const request = new Request("https://example.test/api/agent/github/openclaw/openclaw/overview");
    const build = async () => {
      builds += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return Response.json({ ok: true }, { headers: { "Cache-Control": "public, max-age=60" } });
    };
    const [left, right] = await Promise.all([
      cachedAgentResponse(request, build),
      cachedAgentResponse(request, build),
    ]);
    assert.equal(builds, 1);
    assert.equal(puts, 1);
    assert.deepEqual(await left.json(), { ok: true });
    assert.deepEqual(await right.json(), { ok: true });
  } finally {
    if (originalCaches) Object.defineProperty(globalThis, "caches", originalCaches);
    else Reflect.deleteProperty(globalThis, "caches");
  }
});
