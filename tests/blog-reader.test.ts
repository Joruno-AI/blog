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
