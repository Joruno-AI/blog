import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { MarkdownContent } from "../components/site/markdown-content";
import { PageStructuredData, serializeJsonLd } from "../components/site/page-structured-data";
import { docsMarkdownSanitizeSchema } from "../lib/security/docs-markdown";

// The repository keeps JSX in `preserve` mode for Next.js. `tsx --test`
// transpiles these component fixtures with the classic runtime, so expose the
// runtime exactly for this server-rendering regression test.
Object.assign(globalThis, { React });

test("escapes CMS strings that could terminate a JSON-LD script element", () => {
  const payload = '</script><script id="stored-xss">globalThis.pwned=true</script>';
  const serialized = serializeJsonLd({ title: payload });
  assert.doesNotMatch(serialized, /<\/script>/i);
  assert.match(serialized, /\\u003c\/script\\u003e/);

  const html = renderToStaticMarkup(createElement(PageStructuredData, {
    path: "/blog/security/",
    title: payload,
    description: payload,
  }));
  assert.doesNotMatch(html, /<script id="stored-xss">/i);
  assert.match(html, /\\u003c\/script\\u003e/);
});

test("sanitizes raw CMS HTML while preserving safe Markdown rendering", () => {
  const content = [
    "# Safe heading",
    "",
    '<img src="https://example.com/image.png" onerror="globalThis.pwned=true">',
    '<iframe srcdoc="<script>globalThis.pwned=true</script>"></iframe>',
    "<script>globalThis.pwned=true</script>",
    "",
    "| A | B |",
    "| - | - |",
    "| 1 | 2 |",
  ].join("\n");
  const html = renderToStaticMarkup(createElement(MarkdownContent, { content }));
  assert.doesNotMatch(html, /onerror|<iframe|srcdoc|globalThis\.pwned/i);
  assert.match(html, /<img[^>]+src="https:\/\/example\.com\/image\.png"/);
  assert.match(html, /<table(?:\s|>)/);
  assert.doesNotMatch(html, /node="\[object Object\]"/);
});

function renderDocsMarkdown(content: string) {
  return renderToStaticMarkup(createElement(ReactMarkdown, {
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [
      rehypeRaw,
      [rehypeSanitize, docsMarkdownSanitizeSchema],
      rehypeKatex,
    ],
    children: content,
  }));
}

test("Docs raw HTML uses an allow-list and keeps only safe media URLs", () => {
  const content = [
    '<p style="background:url(https://tracker.invalid/pixel)" data-track="secret" onclick="pwn()">Safe text</p>',
    '<a href="javascript:globalThis.pwned=true">bad link</a>',
    '<img src="data:image/svg+xml,<svg onload=globalThis.pwned=true>" onerror="pwn()">',
    '<iframe srcdoc="<script>globalThis.pwned=true</script>"></iframe>',
    '<svg><foreignObject><form><button formAction="javascript:pwn()">bad</button></form></foreignObject></svg>',
    '<img src="https://example.com/safe.png" alt="safe">',
    '<video controls preload="metadata" src="https://example.com/safe.mp4" poster="data:image/png;base64,tracking"><source src="https://example.com/safe.webm" type="video/webm"><track src="https://example.com/subtitles.vtt" kind="captions"></video>',
  ].join("\n");
  const html = renderDocsMarkdown(content);

  assert.doesNotMatch(html, /style=|data-track|onclick|onerror|javascript:|data:image|srcdoc|formaction/i);
  assert.doesNotMatch(html, /<iframe|<svg|foreignObject|<form|<button/i);
  assert.match(html, /<img[^>]+src="https:\/\/example\.com\/safe\.png"/);
  assert.match(html, /<video[^>]+src="https:\/\/example\.com\/safe\.mp4"/);
  assert.match(html, /<source[^>]+src="https:\/\/example\.com\/safe\.webm"/);
  assert.match(html, /<track[^>]+src="https:\/\/example\.com\/subtitles\.vtt"/);
});

test("Docs sanitizes before KaTeX so untrusted MathML is removed but formulas still render", () => {
  const html = renderDocsMarkdown([
    '<math><mtext style="background:url(https://tracker.invalid)">raw math</mtext></math>',
    "",
    "$E = mc^2$",
  ].join("\n"));
  assert.doesNotMatch(html, /tracker\.invalid/);
  assert.match(html, /^<p>raw math<\/p>/);
  assert.match(html, /class="katex"/);
  assert.match(html, /<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML">/);
  assert.match(html, /<annotation encoding="application\/x-tex">E = mc\^2<\/annotation>/);
});
