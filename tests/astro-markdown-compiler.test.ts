import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { Fragment } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";

import type {
  AstroMarkdownNode,
  AstroMarkdownTree,
} from "@/lib/parity/astro-markdown-tree";
import { compileAstroMarkdown } from "@/scripts/lib/astro-markdown-compiler";

type TestHastNode =
  | { type: "text"; value: string }
  | {
      type: "element";
      tagName: string;
      properties: Record<string, unknown>;
      children: TestHastNode[];
    };

function expand(node: AstroMarkdownNode): TestHastNode {
  return typeof node === "string"
    ? { type: "text", value: node }
    : {
        type: "element",
        tagName: node[0],
        properties: node[1] ?? {},
        children: node[2].map(expand),
      };
}

function render(tree: AstroMarkdownTree) {
  return renderToStaticMarkup(toJsxRuntime({
    type: "root",
    children: tree.map(expand),
  } as Parameters<typeof toJsxRuntime>[0], {
    Fragment,
    jsx,
    jsxs,
    elementAttributeNameCase: "react",
    stylePropertyNameCase: "dom",
  }));
}

test("precompiles the reviewed Astro Markdown pipeline before Next runtime", async () => {
  const html = render(await compileAstroMarkdown([
    '# Heading "quoted"',
    "",
    "[external](https://example.com/docs)",
    "",
    "[![linked image](https://example.com/linked.png)](https://example.com/gallery)",
    "",
    "![Markdown image](https://example.com/markdown.png)",
    "",
    '<img src="https://example.com/raw.png" alt="Raw" style="zoom:50%;">',
    "",
    "| A | B |",
    "| - | - |",
    "| 1 | 2 |",
    "",
    "$E=mc^2$",
    "",
    "```js {1}",
    "const answer = 42",
    "```",
  ].join("\n")));

  assert.match(html, /<h1 id="heading-quoted">Heading “quoted”<a class="header-anchor"/);
  assert.doesNotMatch(html, /class="header-anchor"[^>]*>#<\/a>/);
  assert.match(html, /href="https:\/\/example\.com\/docs"[^>]*target="_blank"/);
  assert.equal((html.match(/class="new-tab-icon"/g) ?? []).length, 1);
  assert.match(html, /<img src="https:\/\/example\.com\/linked\.png" alt="linked image" loading="lazy" decoding="async"/);
  assert.match(html, /<img src="https:\/\/example\.com\/markdown\.png" alt="Markdown image" loading="lazy" decoding="async"/);
  assert.match(html, /<img src="https:\/\/example\.com\/raw\.png" alt="Raw" style="zoom:50%"/);
  assert.doesNotMatch(html, /raw\.png"[^>]*(?:loading|decoding)=/);
  assert.match(html, /<div>\s*<table>/);
  assert.match(html, /<span class="katex">/);
  assert.match(html, /<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML">/);
  assert.match(html, /<div class="expressive-code">/);
  assert.match(html, /<button title="Copy to clipboard"[^>]*data-code="const answer = 42"/);
});

test("sanitizes raw HTML, URL-bearing attributes and CSS before serializing HAST", async () => {
  const html = render(await compileAstroMarkdown([
    '<script>globalThis.pwned=true</script>',
    '<iframe srcdoc="<script>pwn()</script>"></iframe>',
    '<style>body{display:none}</style>',
    '<svg onload="pwn()"><a href="javascript:pwn()">svg</a></svg>',
    '<math href="data:text/html,pwn">raw math</math>',
    '<object data="https://tracker.invalid/object"></object>',
    '<img src="java&#10;script:pwn()" srcset="https://safe.invalid/a.png 1x, data:image/svg+xml,pwn 2x" onerror="pwn()" style="background:url(https://tracker.invalid/pixel)">',
    '<link rel="preload" imagesrcset="javascript:pwn() 1x">',
    '<a href="data:text/html,pwn" ping="https://safe.invalid/ping javascript:pwn()">unsafe link</a>',
    '<form action="javascript:pwn()"><button formaction="javascript:pwn()" onclick="pwn()">visible child</button></form>',
    '<img src="https://safe.invalid/image.png" style="zoom: %;">',
    "",
    "$E=mc^2$",
  ].join("\n")));

  assert.doesNotMatch(
    html,
    /globalThis\.pwned|<script|<iframe|srcdoc|<style|<svg|<object|<form|javascript:|data:text|data:image|onerror|onclick|formaction|tracker\.invalid/i,
  );
  assert.match(html, /<button>visible child<\/button>/);
  assert.match(html, /<a>unsafe link<\/a>/);
  assert.match(html, /<img\/>/);
  assert.match(html, /<img src="https:\/\/safe\.invalid\/image\.png" style="zoom:%"/);
  // Raw MathML is removed, while trusted KaTeX output produced after the
  // first boundary remains available for accessible formula rendering.
  assert.doesNotMatch(html, /raw math/);
  assert.match(html, /<span class="katex">/);
  assert.match(html, /<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML">/);
});

test("preserves the historical visible text of numeric directive names", async () => {
  const html = render(await compileAstroMarkdown([
    "_border:1px solid_",
    "",
    "每个节点都与屏幕上的视图有1:1的关系。",
  ].join("\n")));

  assert.match(html, /<em>border&lt;1px&gt;&lt;\/1px&gt; solid<\/em>/);
  assert.match(html, /1&lt;1的关系&gt;&lt;\/1的关系&gt;/);
  assert.doesNotMatch(html, /<1px>|<1的关系>/);
});

test("keeps the heavy compiler outside every Next runtime import boundary", () => {
  const root = process.cwd();
  const source = (file: string) => readFileSync(path.join(root, file), "utf8");
  const runtimeGraph = [
    "app/(site)/blog/[...slug]/page.tsx",
    "components/site/astro-markdown-content.tsx",
    "components/site/astro-markdown-enhancer.tsx",
    "lib/parity/public-content-build.ts",
    "lib/parity/astro-markdown-tree.ts",
  ].map(source).join("\n");

  assert.doesNotMatch(
    runtimeGraph,
    /from\s+["'](?:rehype-expressive-code|remark-parse|remark-rehype|unified|shiki)["']|scripts\/lib\/astro-markdown-compiler/i,
  );
  assert.doesNotMatch(runtimeGraph, /dangerouslySetInnerHTML/);
  assert.match(source("scripts/generate-public-content-snapshot.ts"), /compileAstroMarkdown/);
  assert.match(source("scripts/lib/astro-markdown-compiler.ts"), /rehypeExpressiveCode/);
});
