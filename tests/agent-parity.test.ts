import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  agentPackageManifestPaths,
  agentDocumentHeadings,
  buildAgentManifestGraph,
  githubTreeFromPayload,
  normalizeAgentRepository,
  parseAgentPackageManifest,
  repositoryDocumentFiles,
  repositoryEntryFiles,
} from "../lib/agent/repository";
import { extractDeepWikiPage, parseDeepWikiOutline } from "../lib/agent/deepwiki";
import {
  agentRepositoryImageCandidates,
  normalizeAgentMarkdown,
  normalizeAgentMermaidSource,
  parseAgentInlineFileReference,
  resolveAgentRepositoryPath,
} from "../lib/agent/markdown";
import { decodeZReadFlightPayloads, normalizeZReadCallouts } from "../lib/agent/zread";

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

test("preserves the complete Astro Agent indexes and scene taxonomy", () => {
  const full = readJson("public/agent/full-index.json") as { items: unknown[] };
  const suggest = readJson("lib/parity/data/agent-suggest-index.json") as { items: unknown[] };
  const scenes = readJson("lib/parity/data/agent-scenes.json") as { groups: unknown[]; scenes: unknown[] };
  assert.equal(full.items.length, 28_868);
  assert.equal(suggest.items.length, full.items.length);
  assert.equal(scenes.groups.length, 8);
  assert.equal(scenes.scenes.length, 56);
});

test("replaces Agent placeholder pages with the migrated catalog experiences", () => {
  for (const path of [
    "app/(site)/agent/page.tsx",
    "app/(site)/agent/all/page.tsx",
    "app/(site)/agent/trending/page.tsx",
    "app/(site)/agent/masters/page.tsx",
    "app/(site)/agent/scenes/page.tsx",
  ]) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /AgentRoutePage|SectionPage/);
  }
});

test("keeps the Astro SkillsNav mobile header geometry", () => {
  const css = readFileSync("app/agent-parity.css", "utf8");
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.astro-site\[data-page-kind="agent"\] \.astro-main \{ padding-inline: 1\.75rem; \}/);
  assert.match(css, /\.agent-page-head \{ padding: \.25rem 0 0; \}/);
  assert.match(css, /\.agent-page-head > h1 \{[\s\S]*?font-size: clamp\(1\.85rem, 9vw, 2\.15rem\);[\s\S]*?line-height: 1\.05;/);
  assert.match(css, /\.agent-page-head > p \{[\s\S]*?margin-top: \.65rem;[\s\S]*?padding-inline: \.75rem;[\s\S]*?font-size: \.82rem;/);
});

test("serves Agent aggregate pages with compact SSR projections and browser index refreshes", () => {
  for (const path of [
    "app/(site)/agent/page.tsx",
    "app/(site)/agent/all/page.tsx",
    "app/(site)/agent/trending/page.tsx",
    "app/(site)/agent/masters/page.tsx",
    "app/(site)/agent/scenes/page.tsx",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /force-dynamic|getSelectedAgentSkills/);
    assert.match(source, /Agent(?:Overview|Catalog|Trending|Masters|Scenes)Island/);
    assert.match(source, /agent(?:Overview|Catalog|Trending|Masters|Scene(?:Counts)?)Initial/);
  }
  const islands = readFileSync("components/site/agent-aggregate-islands.tsx", "utf8");
  for (const implementation of ["agent-overview", "agent-catalog", "agent-trending", "agent-masters", "agent-scenes", "agent-scene-detail"]) {
    assert.match(islands, new RegExp(implementation));
  }
  const aggregateDefinitions = islands.slice(0, islands.indexOf("const BrowserAgentCompareTool"));
  assert.doesNotMatch(aggregateDefinitions, /ssr:\s*false/);
  assert.doesNotMatch(islands, /BrowserAgentCompareTool[\s\S]*ssr:\s*false/);

  const projection = readFileSync("lib/parity/data/agent-ssr-projection.json", "utf8");
  assert.ok(Buffer.byteLength(projection) < 400_000);
  assert.match(projection, /2026-08-28T05:01:06\.532Z/);

  const browserData = readFileSync("components/site/agent-browser-data.ts", "utf8");
  assert.match(browserData, /\/agent\/full-index\.json/);
  assert.match(browserData, /fullIndexRequest \?\?=/);
  assert.match(browserData, /selectedIndexRequest \?\?=/);

  for (const component of ["agent-overview", "agent-catalog", "agent-masters"]) {
    const source = readFileSync(`components/site/${component}.tsx`, "utf8");
    assert.match(source, /loadAgentFullIndex/);
    assert.match(source, /loadAgentSelectedIndex/);
    assert.match(source, /selectedAgentSkill/);
  }
  const masters = readFileSync("components/site/agent-masters.tsx", "utf8");
  assert.match(masters, /totalInstalls/);
  assert.match(masters, /AgentSourceIcon name="i-ri-download-2-line"/);
});

test("keeps scene lists static while preserving the Astro top-30 ranking", () => {
  const route = readFileSync("app/(site)/agent/scenes/[slug]/page.tsx", "utf8");
  assert.doesNotMatch(route, /force-dynamic|getSelectedAgentSkills/);
  assert.match(route, /generateStaticParams/);
  assert.match(route, /dynamicParams = false/);
  const detail = readFileSync("components/site/agent-scene-detail.tsx", "utf8");
  assert.match(detail, /sort\(\(a, b\) => b\.s - a\.s\)/);
  assert.match(detail, /slice\(0, 30\)/);
  assert.match(detail, /loadAgentFullIndex/);
  const middleware = readFileSync("middleware.ts", "utf8");
  assert.match(middleware, /isKnownAgentScenePath\(pathname\) === false/);
});

test("caches the compact selected Agent metadata endpoint with validators", () => {
  const route = readFileSync("app/(site)/agent/selected-index.json/route.ts", "utf8");
  assert.match(route, /cachedAgentResponse/);
  assert.match(route, /ETag/);
  assert.match(route, /If-None-Match/);
  assert.match(route, /s-maxage=3600, stale-while-revalidate=86400/);
  for (const field of ["descZh", "installs", "keywords", "pushedAt", "createdAt", "language", "starsDelta"]) {
    assert.match(route, new RegExp(`skill\\.${field}`));
  }
  assert.doesNotMatch(route, /skill\.(?:content|platforms|tags|path)/);
  assert.match(readFileSync("middleware.ts", "utf8"), /"\/agent\/selected-index\.json"/);
});

test("keeps the direct Astro suggest-index response shape and cache contract", () => {
  const suggest = readJson("lib/parity/data/agent-suggest-index.json") as { items: Array<Record<string, unknown>> };
  assert.deepEqual(Object.keys(suggest.items[0]).sort(), ["a", "c", "f", "n", "s"]);
  assert.ok(suggest.items.every((item) => Object.keys(item).length === 5));
  const route = readFileSync("app/(site)/agent/suggest-index.json/route.ts", "utf8");
  assert.doesNotMatch(route, /Response\.redirect/);
  assert.match(route, /max-age=3600, stale-while-revalidate=86400/);
});

test("normalizes repository fallbacks and rejects reserved Agent routes", () => {
  assert.equal(normalizeAgentRepository("https://github.com/anthropics/skills.git/"), "anthropics/skills");
  assert.equal(normalizeAgentRepository("openclaw/openclaw"), "openclaw/openclaw");
  assert.equal(normalizeAgentRepository("scenes/browser-automation"), "");
  assert.equal(normalizeAgentRepository("owner/repo/extra"), "");
});

test("reconstructs reader headings, documentation and entry paths", () => {
  assert.deepEqual(agentDocumentHeadings("# Intro\n## 使用方法\n### Install\n## 使用方法").map(({ id, depth }) => ({ id, depth })), [
    { id: "intro", depth: 1 },
    { id: "使用方法", depth: 2 },
    { id: "install", depth: 3 },
    { id: "使用方法-1", depth: 2 },
  ]);
  const tree = githubTreeFromPayload({ tree: [
    { path: "src", type: "tree" },
    { path: "README.md", type: "blob", size: 100 },
    { path: "docs/architecture.md", type: "blob", size: 200 },
    { path: "src/index.ts", type: "blob", size: 300 },
    { path: "vendor", type: "commit" },
  ] });
  assert.equal(tree.length, 4);
  assert.equal(repositoryEntryFiles(tree)[0]?.path, "README.md");
  assert.deepEqual(repositoryDocumentFiles(tree).map((item) => item.path), ["README.md", "docs/architecture.md"]);
});

test("ships the complete knowledge reader and interactive Atlas instead of an index placeholder", () => {
  const reader = readFileSync("components/site/agent-knowledge-reader-impl.tsx", "utf8");
  for (const contract of ["仓库地图", "项目依赖总览", "代码库文档", "文件浏览器", "搜索章节", "data-atlas-open", "api/agent/github"]) assert.match(reader, new RegExp(contract));
  assert.match(readFileSync("app/(site)/agent/[...id]/page.tsx", "utf8"), /slice\(0, 2\)/);
  const githubProxy = readFileSync("app/api/agent/github/[...path]/route.ts", "utf8");
  assert.doesNotMatch(githubProxy, /GITHUB_TOKEN|action === "contents"|Authorization/);
  assert.match(githubProxy, /isAgentRepositoryAllowed/);
});

test("restores all eight scene groups and the original top-30 scene detail contract", () => {
  const scenes = readJson("lib/parity/data/agent-scenes.json") as { groups: unknown[]; scenes: unknown[] };
  assert.equal(scenes.groups.length, 8);
  assert.equal(scenes.scenes.length, 56);
  const detail = readFileSync("components/site/agent-scene-detail.tsx", "utf8");
  assert.match(detail, /slice\(0, 30\)/);
  assert.match(detail, /按 Star 数展示前/);
  assert.match(detail, /hasDetail=\{Boolean\(detail\)\}/);
});

test("uses the Astro scene OG path without inserting a slash before .png", () => {
  const source = readFileSync(
    "app/(site)/agent/scenes/[slug]/page.tsx",
    "utf8",
  );
  assert.match(source, /image:\s*`\/og-images\/agent\/scenes\/\$\{scene\.slug\}\.png`/);
  assert.doesNotMatch(source, /`\/og-images\$\{path\}\.png`/);
});

test("restores the ZRead to DeepWiki generated-document cascade", () => {
  const encoded = JSON.stringify('1:{"pages":[],"refresh_chance":0}').slice(1, -1);
  assert.deepEqual(decodeZReadFlightPayloads(`<script>self.__next_f.push([1,"${encoded}"])</script>`), ['1:{"pages":[],"refresh_chance":0}']);
  assert.match(normalizeZReadCallouts("<CgxWarning>check this</CgxWarning>"), /> \*\*注意\*\* check this/);
  assert.deepEqual(parseDeepWikiOutline("- 1 Overview\n  - 1.1 Install"), [
    { depth: 0, id: "1", title: "Overview" },
    { depth: 1, id: "1.1", title: "Install" },
  ]);
  assert.match(extractDeepWikiPage("# Page: One\nA\n# Page: Two\nB", "Two"), /# Page: Two\nB/);
  for (const path of ["app/api/zread/[...path]/route.ts", "app/api/deepwiki/[...path]/route.ts"]) {
    const route = readFileSync(path, "utf8");
    assert.match(route, /stale-while-revalidate=86400/);
    assert.match(route, /cachedAgentResponse/);
  }
  const cache = readFileSync("lib/agent/platform-cache.ts", "utf8");
  assert.match(cache, /caches\?\.default/);
  assert.match(cache, /response\.clone\(\)/);
  const middleware = readFileSync("middleware.ts", "utf8");
  assert.match(middleware, /"\/api\/zread"/);
  assert.match(middleware, /"\/api\/deepwiki"/);
  const reader = readFileSync("components/site/agent-knowledge-reader-impl.tsx", "utf8");
  assert.match(reader, /\["zread", "deepwiki"\] as const/);
  assert.match(reader, /source === "zread" \? 1 : 3/);
  assert.match(reader, /window\.sessionStorage/);
});

test("reconstructs package workspace dependency edges from package manifests", () => {
  const items = githubTreeFromPayload({ tree: [
    { path: "package.json", type: "blob" },
    { path: "packages/a/package.json", type: "blob" },
    { path: "packages/b/package.json", type: "blob" },
    { path: "node_modules/no/package.json", type: "blob" },
  ] });
  assert.deepEqual(agentPackageManifestPaths(items).map((item) => item.path), ["package.json", "packages/a/package.json", "packages/b/package.json"]);
  const parsed = [
    parseAgentPackageManifest("package.json", JSON.stringify({ name: "root", dependencies: { "@repo/a": "workspace:*" } }), "repo"),
    parseAgentPackageManifest("packages/a/package.json", JSON.stringify({ name: "@repo/a", dependencies: { "@repo/b": "workspace:*" } }), "repo"),
    parseAgentPackageManifest("packages/b/package.json", JSON.stringify({ name: "@repo/b" }), "repo"),
  ];
  const graph = buildAgentManifestGraph(parsed);
  assert.deepEqual(graph[0].dependencies, ["packages/a/package.json"]);
  assert.deepEqual(graph[1].dependencies, ["packages/b/package.json"]);
  assert.deepEqual(graph[2].incoming, ["packages/a/package.json"]);
  const renderer = readFileSync("components/site/agent-markdown-impl.tsx", "utf8");
  for (const contract of ["rehypeAgentDOMPurify", "codeToHtml", "AgentMermaid", "agentRepositoryImageCandidates", "resolveAgentRepositoryPath"]) assert.match(renderer, new RegExp(contract));
  const rendererBoundary = readFileSync("components/site/agent-markdown.tsx", "utf8");
  assert.match(rendererBoundary, /dynamic\(/);
  assert.match(rendererBoundary, /ssr:\s*false/);
  assert.match(rendererBoundary, /agent-markdown-impl/);
  assert.doesNotMatch(rendererBoundary, /shiki\/bundle\/full/);
});

test("keeps the original generated Markdown, Mermaid and repository asset rewrite contracts", () => {
  assert.equal(resolveAgentRepositoryPath("../assets/logo dark.png#hero", "docs/guide/readme.md"), "docs/assets/logo dark.png");
  assert.deepEqual(parseAgentInlineFileReference("src/index.ts#L12C4", "docs/readme.md"), { path: "docs/src/index.ts", line: 12, column: 4 });
  assert.match(normalizeAgentMarkdown("-item\nText **broken* text"), /^- item\nText \*\*broken\*\* text$/);
  assert.match(normalizeAgentMermaidSource("flowchart LR\n  [GC] -- \"Client\""), /GC\["Client"\]/);
  const images = agentRepositoryImageCandidates("../assets/logo.png", "owner/repo", "main", "docs/readme.md");
  assert.equal(images.length, 2);
  assert.match(images[0], /^https:\/\/raw\.githubusercontent\.com\/owner\/repo\/main\/assets\/logo\.png$/);
  assert.match(images[1], /^https:\/\/cdn\.jsdelivr\.net\/gh\/owner\/repo@main\/assets\/logo\.png$/);
  const renderer = readFileSync("components/site/agent-markdown-impl.tsx", "utf8");
  assert.match(renderer, /mermaid@11\.17\.2/);
  assert.match(renderer, /vitesse-light/);
  assert.match(renderer, /noopener nofollow/);
  assert.match(renderer, /agent-image-unavailable/);
});
