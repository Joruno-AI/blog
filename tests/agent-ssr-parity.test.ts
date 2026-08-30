import assert from "node:assert/strict";
import { statSync } from "node:fs";
import test from "node:test";

import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AgentCatalog } from "../components/site/agent-catalog";
import { AgentCompareTool } from "../components/site/agent-compare-tool";
import { AgentKnowledgeLoading } from "../components/site/agent-knowledge-reader-loading";
import { AgentMasters } from "../components/site/agent-masters";
import { AgentOverview } from "../components/site/agent-overview";
import { AgentScenes } from "../components/site/agent-scenes";
import { AgentTrending } from "../components/site/agent-trending";
import {
  AGENT_INDEX_GENERATED_AT,
  LEGACY_AGENT_SSR_DISPLAY_AT,
  LEGACY_AGENT_TRENDING_AT,
  agentCatalogInitial,
  agentMastersInitial,
  agentOverviewInitial,
  agentSceneCountsInitial,
  agentTrendingInitial,
  selectedAgentPreview,
} from "../lib/agent/ssr-projections";

// The application build uses Next's automatic JSX runtime. The test runner
// transpiles imported TSX in isolation, so expose React for that legacy path.
(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("renders meaningful aggregate Agent HTML from compact projections", () => {
  const overview = renderToStaticMarkup(createElement(AgentOverview, { initial: agentOverviewInitial() }));
  assert.match(overview, /从 28,868 个开源 Skill/);
  assert.match(overview, /openclaw/);
  assert.match(overview, /安全评级通过/);
  assert.match(overview, /更新于 8月26日 13:08/);
  assert.doesNotMatch(overview, /正在读取 Agent 索引/);

  const catalog = renderToStaticMarkup(createElement(AgentCatalog, { projection: agentCatalogInitial() }));
  assert.match(catalog, /找到 28,868 个项目 · 第 1\/602 页/);
  assert.match(catalog, /claude-hud/);
  assert.match(catalog, /13,444/);
  assert.match(catalog, /<strong>已选择 0\/3<\/strong>/);
  assert.doesNotMatch(catalog, /已选择 0<!-- -->\/3/);
  assert.doesNotMatch(catalog, /正在读取全量索引/);

  const trending = renderToStaticMarkup(createElement(AgentTrending, { initial: agentTrendingInitial() }));
  assert.match(trending, /最近更新/);
  assert.match(trending, /posthog/);
  assert.doesNotMatch(trending, /正在读取趋势索引/);

  const masters = renderToStaticMarkup(createElement(AgentMasters, { initial: agentMastersInitial() }));
  assert.match(masters, /affaan-m/);
  assert.match(masters, /累计 Stars/);
  assert.doesNotMatch(masters, /正在读取创作者索引/);

  const scenes = renderToStaticMarkup(createElement(AgentScenes, { initialCounts: agentSceneCountsInitial() }));
  assert.match(scenes, /MCP 数据库/);
  assert.match(scenes, /\d[\d,]* 个项目/);

  const compare = renderToStaticMarkup(createElement(AgentCompareTool, { requested: [] }));
  assert.match(compare, /HEAD-TO-HEAD/);
  assert.match(compare, /把选择拆成可检查的信号/);
  assert.doesNotMatch(compare, /正在读取对比工具/);
});

test("renders selected repository identity, metadata and skeleton before hydration", () => {
  const skill = selectedAgentPreview("anthropics/skills");
  assert.ok(skill);
  const html = renderToStaticMarkup(createElement(AgentKnowledgeLoading, { skill }));

  assert.match(html, /<h1>skills<\/h1>/);
  assert.match(html, /anthropics\/skills/);
  assert.match(html, /Anthropic 官方 Agent Skills 仓库/);
  assert.match(html, /170\.9k/);
  assert.match(html, /Python/);
  assert.match(html, /搜索章节/);
  assert.match(html, /正在读取 ZRead 文档与仓库源码/);
  assert.match(html, /正文加载后显示标题/);
  assert.match(html, /项目依赖总览/);
  assert.match(html, /代码库文档/);
  assert.match(html, /文件浏览器/);
  assert.match(html, /<img[^>]+data-repo-avatar="true"/);
  assert.match(html, /<nav[^>]+data-page-toc="true"[^>]+aria-label="本页章节"/);
  assert.doesNotMatch(html, /skill-avatar-fallback|KNOWLEDGE|ON THIS PAGE/);
  assert.doesNotMatch(html, />文档目录</);
  assert.doesNotMatch(html, /<h1>正在读取仓库/);
});

test("keeps SSR payload inputs compact and pins endpoint and legacy display snapshots", () => {
  assert.equal(AGENT_INDEX_GENERATED_AT, "2026-08-28T05:01:06.532Z");
  assert.equal(LEGACY_AGENT_SSR_DISPLAY_AT, "2026-08-26T05:08:00.000Z");
  assert.equal(LEGACY_AGENT_TRENDING_AT, "2026-08-29T05:01:06.532Z");
  const projectionBytes = statSync("lib/parity/data/agent-ssr-projection.json").size;
  const selectedMetadataBytes = statSync("lib/parity/data/agent-selected-metadata.json").size;
  const fullIndexBytes = statSync("public/agent/full-index.json").size;
  assert.ok(projectionBytes + selectedMetadataBytes < 500_000);
  assert.ok(fullIndexBytes > 6_000_000);
});
