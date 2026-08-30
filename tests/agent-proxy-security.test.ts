import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseAgentRepositoryAllowlist } from "../lib/agent/repository-access";
import { readLimitedText, UpstreamResponseTooLargeError } from "../lib/agent/upstream";
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
  assert.doesNotMatch(github, /GITHUB_TOKEN|Authorization|action === "contents"/);
  assert.match(github, /isAgentRepositoryAllowed/);
  assert.match(github, /readLimitedText\(response, 6_000_000\)/);
  assert.match(github, /slice\(0, 5_000\)/);

  for (const route of ["app/api/deepwiki/[...path]/route.ts", "app/api/zread/[...path]/route.ts"]) {
    assert.match(readFileSync(route, "utf8"), /isAgentRepositoryAllowed/);
  }
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
  const limited = await agentRateLimitResponse(new Request("https://example.test/api/deepwiki/openclaw/openclaw/overview", {
    headers: { "cf-connecting-ip": "192.0.2.4" },
  }), exhausted);
  assert.equal(limited?.status, 429);
  assert.equal(limited?.headers.get("retry-after"), "60");
  assert.equal(key, "192.0.2.4:deepwiki");

  assert.equal(await agentRateLimitResponse(new Request("https://example.test/blog/"), exhausted), null);
});

test("production and review Workers both configure independent Agent limiters", () => {
  const config = readFileSync("wrangler.toml", "utf8");
  assert.match(config, /\[\[ratelimits\]\][\s\S]*?namespace_id = "1710642275"[\s\S]*?limit = 90/);
  assert.match(config, /\[\[env\.review\.ratelimits\]\][\s\S]*?namespace_id = "1710642276"[\s\S]*?limit = 90/);
});
