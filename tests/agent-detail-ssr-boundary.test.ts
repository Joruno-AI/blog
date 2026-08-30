import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("pre-renders all 400 selected Agent details without querying D1 at build time", () => {
  const page = source("app/(site)/agent/[...id]/page.tsx");
  const snapshot = JSON.parse(source("lib/parity/data/agent-selected-summaries.json")) as {
    source: { revision: string; path: string; count: number };
    items: Record<string, { repository: string; title: string; description: string }>;
  };
  const fullIndex = JSON.parse(source("public/agent/full-index.json")) as {
    items: Array<{ f: string; n: string }>;
  };
  const fullIndexByRepository = new Map(fullIndex.items.map((item) => [item.f, item]));

  assert.equal(snapshot.source.revision, "e734b674668d238bd92af43322780ed25429cc3b");
  assert.equal(snapshot.source.path, "src/content/skills/data.json");
  assert.equal(snapshot.source.count, 400);
  assert.equal(Object.keys(snapshot.items).length, 400);
  for (const [path, item] of Object.entries(snapshot.items)) {
    assert.equal(path, `/agent/${item.repository}`);
    assert.equal(item.repository.split("/").length, 2);
    assert.equal(item.title, fullIndexByRepository.get(item.repository)?.n);
    assert.ok(item.description);
    assert.deepEqual(Object.keys(item).sort(), ["description", "repository", "title"]);
  }

  assert.match(page, /export const dynamicParams = true/);
  assert.match(page, /generateStaticParams/);
  assert.match(page, /selectedAgentStaticParams\(\)/);
  assert.match(page, /getSelectedAgentSummary\(path\) \?\? await getPublicResourceSummary\(path\)/);
  assert.match(page, /const resource = await getAgentSummary\(path\)/);
  assert.match(page, /resourcePath=\{resource\.path\}/);
  assert.match(page, /<AgentIndexDetail repo=\{await repositoryOf\(params\)\}/);
  assert.doesNotMatch(page, /\bgetPublicResource\b/);
  assert.doesNotMatch(page, /resource\.content/);
});

test("regenerates the selected summary snapshot solely from the retained Astro source revision", () => {
  const generator = source("scripts/generate-agent-selected-summaries.mjs");

  assert.match(generator, /git[\s\S]*show/);
  assert.match(generator, /e734b674668d238bd92af43322780ed25429cc3b/);
  assert.match(generator, /src\/content\/skills\/data\.json/);
  assert.match(generator, /expectedCount = 400/);
  assert.doesNotMatch(generator, /wrangler|d1 execute|https?:\/\//i);
});

test("renders the heavy Agent reader only as a browser island", () => {
  const boundary = source("components/site/agent-knowledge-reader.tsx");
  const implementation = source("components/site/agent-knowledge-reader-impl.tsx");

  assert.match(boundary, /dynamic\(/);
  assert.match(boundary, /ssr:\s*false/);
  assert.match(boundary, /agent-knowledge-reader-impl/);
  assert.match(boundary, /AgentKnowledgeLoading/);
  assert.doesNotMatch(boundary, /api\/agent\/github|AgentMarkdown|readWikiJson/);

  assert.match(implementation, /fetch\(`\/api\/public\/resources\/\$\{encodedPath\}`/);
  assert.match(implementation, /payload\.type !== "tool"/);
  assert.match(implementation, /agentSkillFromResource\(payload\)/);
  assert.match(implementation, /<AgentKnowledgeReaderContent repo=\{repo\} skill=\{loadedSkill \?\? skill\} \/>/);
  for (const contract of ["api/agent/github", "readWikiJson", "AgentMarkdown", "\u4ed3\u5e93\u5730\u56fe", "\u6587\u4ef6\u6d4f\u89c8\u5668"]) {
    assert.match(implementation, new RegExp(contract));
  }
});

test("uses the visibility-checked no-store resource endpoint for browser hydration", () => {
  const route = source("app/api/public/resources/[...path]/route.ts");
  const middleware = source("middleware.ts");
  const page = source("app/(site)/agent/[...id]/page.tsx");
  const boundary = source("components/site/agent-knowledge-page.tsx");

  assert.match(route, /getPublicResource\(/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
  assert.doesNotMatch(route, /stale-while-revalidate/);
  assert.match(middleware, /path\.startsWith\("\/api\/public\/resources\/"\)/);
  assert.match(page, /repo=\{resource\.repository\}/);
  assert.match(boundary, /repo\?: string/);
});
