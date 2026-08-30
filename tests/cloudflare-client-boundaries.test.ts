import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("keeps browser-only rendering dependencies outside server-rendered boundaries", () => {
  const boundaries = [
    ["components/site/docs-reader.tsx", "docs-reader-impl", /shiki\/bundle\/full/],
    ["components/site/agent-markdown.tsx", "agent-markdown-impl", /shiki\/bundle\/full/],
    ["components/posts/rich-text-editor.tsx", "rich-text-editor-impl", /@tiptap\/react|lowlight/],
    ["components/site/photo-image-viewer.tsx", "photo-image-viewer-impl", /viewerjs/],
    ["components/site/markdown-image-viewer.tsx", "markdown-image-viewer-impl", /viewerjs/],
  ] as const;

  for (const [path, implementation, browserDependency] of boundaries) {
    const boundary = source(path);
    assert.match(boundary, /dynamic\(/, `${path} must remain a dynamic boundary`);
    assert.match(boundary, /ssr:\s*false/, `${path} must not execute in the Worker`);
    assert.match(boundary, new RegExp(implementation), `${path} must load its browser implementation`);
    assert.doesNotMatch(boundary, browserDependency, `${path} must not import its browser-only dependency`);
  }

  assert.match(source("components/site/docs-reader-impl.tsx"), /shiki\/bundle\/full/);
  assert.match(source("components/site/agent-markdown-impl.tsx"), /shiki\/bundle\/full/);
  assert.match(source("components/posts/rich-text-editor-impl.tsx"), /@tiptap\/react/);
  assert.match(source("components/posts/rich-text-editor-impl.tsx"), /lowlight/);
  assert.match(source("components/site/photo-image-viewer-impl.tsx"), /import\("viewerjs"\)/);
  assert.match(source("components/site/markdown-image-viewer-impl.tsx"), /import\("viewerjs"\)/);

  const markdown = source("components/site/markdown-content.tsx");
  assert.match(markdown, /<MarkdownImageViewer content=\{content\} rootRef=\{rootRef\} \/>/);
  assert.doesNotMatch(markdown, /import\("viewerjs"\)/);
});

test("enables Wrangler's supported bundle minification in the shared deployment config", () => {
  const wrangler = source("wrangler.toml");
  assert.match(wrangler, /^minify = true$/m);
  assert.equal(wrangler.match(/^minify\s*=/gm)?.length, 1);
});

test("serves prerendered route shells from Workers Static Assets before loading NextServer", () => {
  const config = source("open-next.config.ts");
  assert.match(
    config,
    /@opennextjs\/cloudflare\/overrides\/incremental-cache\/static-assets-incremental-cache/,
  );
  assert.match(config, /incrementalCache:\s*staticAssetsIncrementalCache/);
  assert.match(config, /enableCacheInterception:\s*true/);
});
