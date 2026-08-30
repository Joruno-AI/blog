import assert from "node:assert/strict";
import test from "node:test";

import { extractArticleHeadings, headingId, sortBlogReaderPosts } from "@/lib/parity/blog-reader";

test("uses the same Astro category and numeric article ordering", () => {
    const posts = [
      { id: "2", title: "second", slug: "算法/10-second", categoryPath: "算法", categoryNamePath: "算法" },
      { id: "1", title: "first", slug: "算法/2-first", categoryPath: "算法", categoryNamePath: "算法" },
      { id: "0", title: "bun", slug: "包管理工具/bun", categoryPath: "包管理工具", categoryNamePath: "包管理工具" },
    ];
  assert.deepEqual(sortBlogReaderPosts(posts).map((post) => post.id), ["0", "1", "2"]);
});

test("extracts Astro-compatible heading anchors outside code fences", () => {
  assert.equal(headingId("macOS / Linux"), "macos--linux");
  assert.deepEqual(extractArticleHeadings("## Bun 是什么\n```md\n## ignored\n```\n### 兼容性"), [{ depth: 2, text: "Bun 是什么", id: "bun-是什么" }, { depth: 3, text: "兼容性", id: "兼容性" }]);
});

test("uses ASCII-first ordering for equal numeric prefixes", () => {
  const posts = [
    { id: "cn", title: "监听资源更新", slug: "20-监听资源更新", categoryPath: "llm", categoryNamePath: "LLM" },
    { id: "latin", title: "Prompts", slug: "20-prompts", categoryPath: "llm", categoryNamePath: "LLM" },
  ];
  assert.deepEqual(sortBlogReaderPosts(posts).map((post) => post.id), ["latin", "cn"]);
});

test("uses production Chinese category order while keeping miscellaneous last", () => {
  const categoryPaths = ["杂谈", "ai工具", "文档协同", "算法", "打包工具", "并发异步", "包管理工具"];
  const posts = categoryPaths.map((categoryPath) => ({
    id: categoryPath,
    title: categoryPath,
    slug: `${categoryPath}/entry`,
    categoryPath,
    categoryNamePath: categoryPath,
  }));

  assert.deepEqual(sortBlogReaderPosts(posts).map((post) => post.id), [
    "包管理工具",
    "并发异步",
    "打包工具",
    "算法",
    "文档协同",
    "ai工具",
    "杂谈",
  ]);
});

test("still sorts entries inside the miscellaneous category", () => {
  const posts = ["supabase", "cloudflare", "creem"].map((name) => ({
    id: name,
    title: name,
    slug: `杂谈/${name}`,
    categoryPath: "杂谈",
    categoryNamePath: "杂谈",
  }));

  assert.deepEqual(sortBlogReaderPosts(posts).map((post) => post.id), ["cloudflare", "creem", "supabase"]);
});
