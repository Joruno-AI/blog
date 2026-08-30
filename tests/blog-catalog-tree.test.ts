import assert from "node:assert/strict";
import test from "node:test";

import {
  blogIndexGroupLabel,
  buildBlogCatalogTree,
  flattenBlogCatalogTree,
  isBlogCategoryMatch,
} from "@/components/site/blog-catalog-tree";

const posts = [
  { id: "react-10", title: "React 10", slug: "01-frontend/02-react/10-react", categoryPath: "01-frontend/02-react", categoryNamePath: "Frontend/React" },
  { id: "react-2", title: "React 2", slug: "01-frontend/02-react/2-react", categoryPath: "01-frontend/02-react", categoryNamePath: "Frontend/React" },
  { id: "css", title: "CSS", slug: "01-frontend/01-css/1-css", categoryPath: "01-frontend/01-css", categoryNamePath: "Frontend/CSS" },
  { id: "misc", title: "Misc", slug: "misc", categoryPath: null, categoryNamePath: null },
];

test("reconstructs, names, and numerically sorts the Astro category tree", () => {
  const tree = buildBlogCatalogTree(posts);
  assert.deepEqual(tree.map((node) => node.name), ["Frontend", "杂谈"]);
  assert.deepEqual(tree[0].children.map((node) => node.name), ["CSS", "React"]);
  assert.deepEqual(tree[0].children[1].posts.map((post) => post.id), ["react-2", "react-10"]);
});

test("uses raw normalized category slugs for production post-list group labels", () => {
  assert.equal(blogIndexGroupLabel("ai工具"), "ai工具");
  assert.equal(blogIndexGroupLabel("es6"), "es6");
  assert.equal(blogIndexGroupLabel("01-frontend/02-react"), "react");
});

test("flattens hierarchy with depth and descendant totals", () => {
  const flattened = flattenBlogCatalogTree(buildBlogCatalogTree(posts));
  assert.deepEqual(flattened.map(({ node, depth, totalPosts }) => [node.path, depth, totalPosts]), [
    ["01-frontend", 0, 3],
    ["01-frontend/01-css", 1, 1],
    ["01-frontend/02-react", 1, 2],
    ["杂谈", 0, 1],
  ]);
});

test("category filtering includes descendants and normalizes uncategorized posts", () => {
  assert.equal(isBlogCategoryMatch("01-frontend/02-react", "01-frontend"), true);
  assert.equal(isBlogCategoryMatch("01-frontend/02-react", "01-backend"), false);
  assert.equal(isBlogCategoryMatch(null, "杂谈"), true);
});

test("keeps Astro's ASCII-first order for equal numeric and mixed-script slugs", () => {
  const tree = buildBlogCatalogTree([
    { id: "cn", title: "监听资源更新", slug: "20-监听资源更新", categoryPath: "llm", categoryNamePath: "LLM" },
    { id: "latin", title: "Prompts", slug: "20-prompts", categoryPath: "llm", categoryNamePath: "LLM" },
    { id: "cursor-cn", title: "Cursor-完整指南", slug: "cursor-完整指南", categoryPath: "ai工具", categoryNamePath: "AI工具" },
    { id: "cursor-latin", title: "Cursor vs GitHub Copilot", slug: "cursor-vs-github-copilot", categoryPath: "ai工具", categoryNamePath: "AI工具" },
  ]);

  assert.deepEqual(tree.find((node) => node.path === "llm")?.posts.map((post) => post.id), ["latin", "cn"]);
  assert.deepEqual(tree.find((node) => node.path === "ai工具")?.posts.map((post) => post.id), ["cursor-latin", "cursor-cn"]);
});

test("uses production Chinese category collation and keeps miscellaneous last", () => {
  const categoryPaths = ["杂谈", "ai工具", "文档协同", "算法", "打包工具", "并发异步", "包管理工具"];
  const tree = buildBlogCatalogTree(categoryPaths.map((categoryPath) => ({
    id: categoryPath,
    title: categoryPath,
    slug: `${categoryPath}/entry`,
    categoryPath,
    categoryNamePath: categoryPath,
  })));

  assert.deepEqual(tree.map((node) => node.path), [
    "包管理工具",
    "并发异步",
    "打包工具",
    "算法",
    "文档协同",
    "ai工具",
    "杂谈",
  ]);
});
