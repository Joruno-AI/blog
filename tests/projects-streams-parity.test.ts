import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  ASTRO_PROJECT_CATEGORIES,
  ASTRO_PROJECTS,
  ASTRO_STREAMS,
  formatAstroStreamDate,
  groupAstroProjects,
  groupAstroStreams,
  projectAnchorId,
  projectLinkKind,
  restoreAstroProjects,
  restoreAstroStreams,
} from "@/lib/parity/projects-streams";
import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";

function resource(overrides: Partial<PublishedResource> & Pick<PublishedResource, "title">): PublishedResource {
  return {
    id: `fixture:${overrides.title}`,
    type: "project",
    slug: overrides.title.toLowerCase(),
    path: `/projects/${overrides.title.toLowerCase()}`,
    description: "fixture description",
    visibility: "public",
    coverAssetId: null,
    publishedAt: new Date("2026-01-02T00:00:00Z"),
    revisionId: "revision:fixture",
    version: 1,
    content: "",
    contentFormat: "json",
    metadataJson: "{}",
    ...overrides,
  };
}

test("restores the complete d1ec7b0 project directory and its eight numbered groups", () => {
  assert.equal(ASTRO_PROJECTS.length, 21);
  assert.deepEqual(
    groupAstroProjects(ASTRO_PROJECTS).map(({ category, items }) => [category, items.length]),
    [
      ["SaaS", 3],
      ["npm", 6],
      ["导航站", 1],
      ["工具站", 5],
      ["浏览器插件", 1],
      ["小程序", 2],
      ["vscode插件", 1],
      ["iOS", 2],
    ],
  );
  assert.deepEqual(
    ASTRO_PROJECT_CATEGORIES.map(projectAnchorId),
    ["saas", "npm", "导航站", "工具站", "浏览器插件", "小程序", "vscode插件", "ios"],
  );
  assert.deepEqual(restoreAstroProjects([]), []);
  assert.deepEqual(restoreAstroProjects([
    resource({
      title: "CMS Project",
      metadataJson: JSON.stringify({ externalUrl: "https://example.com", category: "SaaS", icon: "i-ph-star", order: 1 }),
    }),
  ]), [{ id: "CMS Project", link: "https://example.com", desc: "fixture description", icon: "i-ph-star", category: "SaaS" }]);
  assert.equal(projectLinkKind("https://github.com/Joruno-AI/blog"), "GitHub");
  assert.equal(projectLinkKind("https://docs.github.com/en"), "GitHub");
  assert.equal(projectLinkKind("https://wangshengliang.cn"), "网站");
  assert.equal(projectLinkKind("broken"), "链接");
});

test("restores and sorts the exact Astro Streams dates and year groups", () => {
  assert.equal(ASTRO_STREAMS.length, 10);
  const groups = groupAstroStreams(ASTRO_STREAMS);
  assert.deepEqual(groups.map(({ year, items }) => [year, items.length]), [
    ["2024", 2],
    ["2023", 6],
    ["2022", 1],
    ["2021", 1],
  ]);
  assert.deepEqual(groups[0].items.map(({ id }) => id), [
    "Astro Launches an Integrated Database",
    "You Don’t Know How to SSR",
  ]);
  assert.equal(formatAstroStreamDate("2024-03-18"), "3月18日");
  assert.equal(formatAstroStreamDate("2023-12-19"), "12月19日");
  assert.deepEqual(restoreAstroStreams([]), []);
  assert.deepEqual(restoreAstroStreams([
    resource({
      type: "document",
      title: "CMS Stream",
      path: "/streams/cms-stream",
      metadataJson: JSON.stringify({ externalUrl: "https://example.com/watch", video: true, radio: false, platform: "Example", order: 0 }),
    }),
  ]), [{ id: "CMS Stream", pubDate: "2026-01-02", link: "https://example.com/watch", video: true, radio: false, platform: "Example" }]);
});

test("ports the Astro scrollspy, history, tab, media, and responsive contracts", () => {
  const projectNav = readFileSync(join(process.cwd(), "components/site/project-anchor-nav.tsx"), "utf8");
  const streamNav = readFileSync(join(process.cwd(), "components/site/stream-year-navigation.tsx"), "utf8");
  const streamPage = readFileSync(join(process.cwd(), "app/(site)/streams/page.tsx"), "utf8");
  const styles = readFileSync(join(process.cwd(), "app/projects-streams-parity.css"), "utf8");

  assert.match(projectNav, /rootMargin: "-18% 0px -72% 0px"/);
  assert.match(projectNav, /scrollIntoView/);
  assert.match(projectNav, /history\.replaceState/);
  assert.match(streamNav, /rootMargin: "0% 0% -75% 0%"/);
  assert.match(streamNav, /aria-modal="true"/);
  assert.match(streamPage, /Changelog/);
  assert.match(streamPage, /AstroBlog/);
  assert.match(streamPage, /AstroStreams/);
  assert.match(styles, /grid-template-columns: 8\.75rem minmax\(0, 1fr\)/);
  assert.match(styles, /@media \(max-width: 1127px\)/);
  assert.match(styles, /font-size: 6rem/);
});

test("projects and streams use the complete committed build snapshot", () => {
  const projectPage = readFileSync(
    join(process.cwd(), "app/(site)/projects/page.tsx"),
    "utf8"
  );
  const streamPage = readFileSync(
    join(process.cwd(), "app/(site)/streams/page.tsx"),
    "utf8",
  );
  for (const source of [projectPage, streamPage]) {
    assert.match(source, /dynamic = "force-static"/);
    assert.match(source, /getPublicContentSnapshot/);
    assert.match(source, /snapshotPublishedResources/);
    assert.doesNotMatch(source, /getPublishedResources|collectAllPages|force-dynamic/);
  }
});
