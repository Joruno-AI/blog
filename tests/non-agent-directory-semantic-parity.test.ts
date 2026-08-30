import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ChangelogDirectory } from "@/components/site/changelog-directory";
import { DocsReaderLoadingShell } from "@/components/site/docs-reader-loading-shell";
import { GithubActivityEmpty } from "@/components/site/github-activity-empty";
import { MarkdownContent } from "@/components/site/markdown-content";
import { ProjectDirectory } from "@/components/site/project-directory";
import { ShortsDirectory } from "@/components/site/shorts-directory";
import { StreamDirectory } from "@/components/site/stream-directory";
import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";

// @ts-ignore Node executes the semantic audit utility directly as ESM JavaScript.
import { semanticTextProjection } from "../scripts/cside-parity-core.mjs";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function semanticText(element: React.ReactNode, path = "/") {
  return semanticTextProjection(`<main>${renderToStaticMarkup(element)}</main>`, path).text as string;
}

function resource(overrides: Partial<PublishedResource>): PublishedResource {
  return {
    id: "fixture",
    type: "project",
    title: "Fixture",
    slug: "fixture",
    path: "/projects/fixture",
    description: "Description",
    visibility: "public",
    coverAssetId: null,
    publishedAt: new Date("2024-03-18T00:00:00.000Z"),
    revisionId: "revision:fixture",
    version: 1,
    content: "",
    contentFormat: "json",
    metadataJson: "{}",
    ...overrides,
  };
}

test("preserves authored inline boundaries in project, stream, short, PR and release DOM text", () => {
  const project = semanticText(React.createElement(ProjectDirectory, {
    resources: [resource({
      title: "OutfitAI",
      metadataJson: JSON.stringify({ externalUrl: "https://example.com", category: "SaaS", icon: "fixture", order: 1 }),
    })],
  }), "/projects/");
  assert.match(project, /OutfitAI网站 Description/);

  const stream = semanticText(React.createElement(StreamDirectory, {
    resources: [resource({
      type: "document",
      title: "Astro Launches an Integrated Database",
      path: "/streams/fixture",
      metadataJson: JSON.stringify({ externalUrl: "https://example.com", radio: true, video: false, platform: "ShopTalk", order: 1 }),
    })],
  }), "/streams/");
  assert.equal(stream, "2024 Astro Launches an Integrated Database3月18日· ShopTalk");

  const shorts = semanticText(React.createElement(ShortsDirectory, {
    items: [{ id: "fixture", title: "Title", path: "/shorts/fixture/", publishedAt: "2026-07-16T00:00:00.000Z", tags: ["aidesignui"] }],
  }), "/shorts/");
  assert.equal(shorts, "Title 2026年7月16日 aidesignui Choose Tags Skip tags aidesignui Tags aidesignui");

  for (const [action, loader, expected] of [
    ["Contributing", "astro-loader-github-prs", "AstroEco is Contributing…"],
    ["Releasing", "astro-loader-github-releases", "AstroEco is Releasing…"],
  ] as const) {
    assert.match(semanticText(React.createElement(GithubActivityEmpty, { action, loader })), new RegExp(`^${expected}`));
  }
});

test("keeps closed changelog mobile projections in Astro order without weakening the audit", () => {
  const text = semanticText(React.createElement(ChangelogDirectory, {
    items: [{ id: "fixture", title: "Title", path: "/changelog/fixture/", publishedAt: "2026-07-07T00:00:00.000Z", minutesRead: 1, tags: ["astro"] }],
  }), "/changelog/");
  assert.equal(text, "Skip toc 2026 Skip tags astro Table of Contents 2026 Tags astro 2026 Title7月7日· 1 min");
});

test("matches the Astro docs loading projection and coalesces text split by stripped raw tags", () => {
  assert.equal(
    semanticText(React.createElement(DocsReaderLoadingShell), "/docs/read/"),
    "本课程 Docs/课程 正在加载文档 复制 用 AI 打开 ChatGPTClaude 沉浸阅读 思维导图 正在从内容快照加载正文 上一篇下一篇 本页目录 文章导图 思维导图 适应 点击节点即可跳转到对应章节，放大后可滚动查看。",
  );
  assert.equal(
    semanticText(React.createElement(MarkdownContent, { content: "add pages.<page>.bgType custom option" }), "/changelog/100/"),
    "add pages..bgType custom option",
  );

  const docsLibrary = readFileSync("components/site/docs-library.tsx", "utf8");
  assert.match(docsLibrary, /\{`\$\{course\.articleCount\} 篇`\}/);
  assert.match(docsLibrary, /<span className="geektime-course-arrow" aria-hidden="true" \/>/);
  assert.doesNotMatch(docsLibrary, /ArrowUpRight/);
});
