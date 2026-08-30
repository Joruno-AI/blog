import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { legacyMetadata } from "@/lib/parity/legacy-metadata";
import {
  changelogCanonicalPath,
  findChangelogBySlug,
  legacyPostDisablesOgImage,
  legacyReadingMinutes,
} from "@/lib/parity/legacy-post";
import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";

function resource(slug: string, path: string): PublishedResource {
  return {
    id: `fixture-${slug}`,
    type: "document",
    title: slug,
    slug,
    path,
    description: "fixture",
    visibility: "public",
    coverAssetId: null,
    publishedAt: new Date("2024-10-06T00:00:00.000Z"),
    revisionId: `revision-${slug}`,
    version: 1,
    content: "fixture",
    contentFormat: "markdown",
    metadataJson: JSON.stringify({
      sourcePath: `src/content/changelog/${path.split("/").at(-1)}.md`,
      tags: ["fixture"],
    }),
  };
}

test("routes migrated changelog entries by their Astro content slug rather than the stale version path", () => {
  const items = [resource("100", "/changelog/1.0.0"), resource("300", "/changelog/3.0.0")];
  assert.equal(changelogCanonicalPath("100"), "/changelog/100/");
  assert.equal(findChangelogBySlug(items, "300")?.path, "/changelog/3.0.0");
  assert.equal(findChangelogBySlug(items, "1.0.0"), null);
});

test("preserves Astro reading-time and ogImage=false for the historical fixture", () => {
  const firstRelease = resource("100", "/changelog/1.0.0");
  const metadata = JSON.parse(firstRelease.metadataJson) as { sourcePath: string };
  assert.equal(legacyReadingMinutes("content can be edited independently", metadata.sourcePath), 6);
  assert.equal(legacyPostDisablesOgImage(firstRelease), true);
  assert.equal(legacyReadingMinutes("一".repeat(600)), 3);
});

test("emits Astro-compatible canonical and social metadata, including image suppression", () => {
  const page = legacyMetadata({
    title: "Release",
    description: "Release notes",
    path: "/changelog/300",
    image: false,
    article: { publishedAt: new Date("2026-08-18T00:00:00.000Z"), tags: ["astro"] },
  });
  assert.deepEqual(page.alternates, { canonical: "/changelog/300/" });
  assert.deepEqual(page.openGraph && "images" in page.openGraph ? page.openGraph.images : undefined, []);
  assert.deepEqual(page.twitter?.images, []);
  assert.deepEqual(page.other, { "twitter:url": "https://wangshengliang.cn/changelog/300/" });
});

test("keeps the legacy footer and custom catch-all 404 in every misc route", () => {
  const root = process.cwd();
  const routeFiles = [
    "app/(site)/shorts/page.tsx",
    "app/(site)/changelog/page.tsx",
    "app/(site)/feeds/page.tsx",
    "app/(site)/prs/page.tsx",
    "app/(site)/releases/page.tsx",
    "app/(site)/404/page.tsx",
    "app/(site)/not-found.tsx",
  ];
  for (const file of routeFiles) {
    assert.match(readFileSync(join(root, file), "utf8"), /LegacyPageFooter/);
  }
  assert.match(readFileSync(join(root, "app/(site)/[...notFound]/page.tsx"), "utf8"), /notFound\(\)/);
  const internal404Page = readFileSync(join(root, "app/(site)/%5Flegacy-404/page.tsx"), "utf8");
  assert.match(internal404Page, /path: "\/404\/"/);
  assert.match(internal404Page, /<h1>404<\/h1>/);
  assert.match(internal404Page, /Nice to meet you tho!/);
  const middleware = readFileSync(join(root, "middleware.ts"), "utf8");
  assert.match(middleware, /rewriteAsNotFound[\s\S]*new URL\(INTERNAL_NOT_FOUND_PATH, request\.url\)/);
  const worker = readFileSync(join(root, "custom-worker.ts"), "utf8");
  assert.match(worker, /url\.pathname === "\/404"/);
  assert.match(worker, /asInternalNotFoundRequest\(request\)/);
  assert.match(worker, /responseWithNotFoundStatus\(response, 200\)/);
  assert.match(worker, /isPrivateRenderPath \|\| isRewrittenNotFound/);
  assert.match(worker, /isDocumentNotFoundResponse\(request, response\)[\s\S]*responseWithNotFoundStatus\(custom, 404\)/);
  assert.match(readFileSync(join(root, "app/changelog-parity.css"), "utf8"), /changelog-year-heading \{[^}]*height:\s*0/);
  assert.match(readFileSync(join(root, "app/shorts-parity.css"), "utf8"), /background:\s*#ffffffcc/);
});

test("mobile tag drawers escape the main stacking context and restore modal state", () => {
  const root = process.cwd();
  const dialog = readFileSync(join(root, "components/site/mobile-tag-dialog.tsx"), "utf8");
  const shorts = readFileSync(join(root, "components/site/shorts-directory.tsx"), "utf8");
  const changelog = readFileSync(join(root, "components/site/changelog-directory.tsx"), "utf8");

  assert.match(dialog, /createPortal\(controls, portalHost\)/);
  assert.match(dialog, /body\.style\.overflow = "hidden"/);
  assert.match(dialog, /event\.key === "Escape"/);
  assert.match(dialog, /trigger\.focus\(\{ preventScroll: true \}\)/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(shorts, /<MobileTagDialog/);
  assert.match(changelog, /<MobileTagDialog/);
});

test("keeps the shared site navigation structurally identical to Astro", () => {
  const root = process.cwd();
  const header = readFileSync(join(root, "components/site/site-header.tsx"), "utf8");
  const parityCss = readFileSync(join(root, "app/astro-parity.css"), "utf8");
  const globalCss = readFileSync(join(root, "app/globals.css"), "utf8");

  for (const href of ["/blog/", "/docs/", "/projects/", "/agent/", "/photos/", "/shorts/", "/music/"]) {
    assert.match(header, new RegExp(`href: "${href.replaceAll("/", "\\/")}"`));
  }
  assert.match(header, /<hr className="nav-divider" aria-hidden="true" \/>/);
  assert.match(header, /hidden=\{!menuRendered\}/);
  assert.match(header, /<NavigationIcon icon="menu-line" \/>/);
  assert.doesNotMatch(header, /menuOpen \? "close-line" : "menu-line"/);
  assert.match(header, /event\.key === "Escape"\) closeMenu\(true, false\)/);
  assert.match(header, /window\.setTimeout\(\(\) => \{[\s\S]*setMenuRendered\(false\)[\s\S]*\}, 240\)/);

  assert.match(parityCss, /#nav-panel\[hidden\]\s*\{\s*display:\s*none\s*!important/);
  assert.match(parityCss, /\.desktop-navigation-link\s*\{\s*opacity:\s*\.5/);
  assert.match(parityCss, /\.desktop-only\s*\{\s*opacity:\s*\.82/);
  assert.match(globalCss, /html:not\(:has\(\.astro-site\)\)[^\n]*::-webkit-scrollbar/);
});

test("keeps Blog, Streams and Changelog public navigation and desktop projections on the Astro contract", () => {
  const root = process.cwd();
  const reader = readFileSync(join(root, "components/site/blog-reader-sidebar.tsx"), "utf8");
  const filter = readFileSync(join(root, "components/site/blog-filter-view.tsx"), "utf8");
  const article = readFileSync(join(root, "app/(site)/blog/[...slug]/page.tsx"), "utf8");
  const streamsCss = readFileSync(join(root, "app/projects-streams-parity.css"), "utf8");
  const changelogPage = readFileSync(join(root, "app/(site)/changelog/page.tsx"), "utf8");
  const changelogDirectory = readFileSync(join(root, "components/site/changelog-directory.tsx"), "utf8");
  const changelogCss = readFileSync(join(root, "app/changelog-parity.css"), "utf8");

  assert.match(reader, /href="\/blog\/"/);
  assert.match(reader, /href=\{`\/blog\/\?category=\$\{encodeURIComponent\(node\.path\)\}`\}/);
  assert.match(reader, /href=\{`\/blog\/\$\{post\.slug\}\/`\}/);
  assert.match(filter, /href=\{`\/blog\/\$\{post\.slug\}\/`\}/);
  assert.match(article, /canonicalPath\.split\("\/"\)\.map\(\(segment\) => encodeURIComponent\(segment\)\)\.join\("\/"\)/);
  assert.match(article, /href=\{`\/blog\/\$\{post\.slug\}\/`\}/);
  assert.match(article, /<Link className="site-link no-underline font-mono" href="\/blog\/" \/>/);

  assert.match(streamsCss, /\.streams-parity-content \.stream-item \{[\s\S]*?color:\s*var\(--c-text\) !important;/);
  assert.match(streamsCss, /\.streams-toc-desktop \{[\s\S]*?left:\s*2rem;/);
  assert.doesNotMatch(streamsCss, /\.streams-toc-desktop \{[\s\S]*?left:\s*-2rem;/);

  for (const href of ["/changelog/", "/feeds/", "/streams/"]) assert.match(changelogPage, new RegExp(`href="${href.replaceAll("/", "\\/")}"`));
  assert.match(changelogDirectory, /desktopPosition="left"/);
  assert.match(changelogDirectory, /context=\{null\}/);
  assert.match(changelogCss, /\.changelog-groups \{ padding-bottom:\s*0;/);
  assert.match(changelogCss, /\.article-toc-skip \{[\s\S]*?clip:\s*rect\(0, 0, 0, 0\)/);
  assert.match(changelogCss, /\.changelog-tag-options \{[^}]*opacity:\s*0;/);
});

test("keeps the Agent overview shell, links and accumulated desktop geometry aligned with Astro", () => {
  const root = process.cwd();
  const nav = readFileSync(join(root, "components/site/agent-nav.tsx"), "utf8");
  const shell = readFileSync(join(root, "components/site/agent-page-shell.tsx"), "utf8");
  const overview = readFileSync(join(root, "components/site/agent-overview.tsx"), "utf8");
  const card = readFileSync(join(root, "components/site/agent-skill-card.tsx"), "utf8");
  const css = readFileSync(join(root, "app/agent-parity.css"), "utf8");

  for (const href of ["/agent/", "/agent/all/", "/agent/scenes/", "/agent/trending/", "/agent/masters/"]) {
    assert.match(nav, new RegExp(`href: "${href.replaceAll("/", "\\/")}"`));
  }
  assert.match(shell, /<div className="agent-page-shell">/);
  assert.doesNotMatch(shell, /<main className="agent-page-shell">/);
  assert.match(shell, /<LegacyPageFooter \/>/);
  assert.match(overview, /const allPath = "\/agent\/all\/"/);
  assert.match(overview, /className="skills-board-select"/);
  assert.match(overview, /className="skills-feature-identity"><Image/);
  assert.match(overview, /className="skills-scene-link"/);
  assert.match(overview, /<small>\{scene\.desc\}<\/small>/);
  assert.match(overview, /\/agent\/scenes\/\$\{scene\.slug\}\//);
  assert.match(card, /<AgentSourceIcon name="i-ri-arrow-right-line" \/>/);

  assert.match(css, /select\.skills-board-select \{[\s\S]*?min-height:\s*2\.15rem;/);
  assert.match(css, /\.agent-source-icon \{[^}]*width:\s*1\.2em;[^}]*height:\s*1\.2em;/);
});
