"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type BlogIndexPost = {
  id: string;
  title: string;
  slug: string;
  categoryPath: string | null;
  categoryNamePath: string | null;
  pubDate: string | null;
  minutesRead: number | null;
};

const date = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric" });
const categoryCollator = new Intl.Collator("zh-CN");

function numberPrefix(value: string) {
  const match = value.split("/").at(-1)?.match(/^(\d+)/);
  return match ? Number.parseInt(match[1], 10) : Number.POSITIVE_INFINITY;
}

function comparePath(a: string, b: string) {
  const numberA = numberPrefix(a);
  const numberB = numberPrefix(b);
  if (numberA !== numberB) return numberA - numberB;
  if (a === "杂谈") return 1;
  if (b === "杂谈") return -1;
  return categoryCollator.compare(a, b);
}

export function BlogFilterView({ posts }: { posts: BlogIndexPost[] }) {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const categories = useMemo(() => {
    const paths = new Map<string, string>();
    for (const post of posts) {
      paths.set(post.categoryPath || "未分类", post.categoryNamePath || "未分类");
    }
    return Array.from(paths, ([path, name]) => ({ path, name })).sort((a, b) => comparePath(a.path, b.path));
  }, [posts]);
  const visible = useMemo(() => posts.filter((post) => {
    const inCategory = category === "all" || post.categoryPath === category || post.categoryPath?.startsWith(`${category}/`);
    const needle = query.trim().toLocaleLowerCase();
    return inCategory && (!needle || post.title.toLocaleLowerCase().includes(needle));
  }), [posts, category, query]);
  const grouped = useMemo(() => {
    const result = new Map<string, BlogIndexPost[]>();
    for (const post of visible) {
      const name = post.categoryNamePath?.split("/").at(-1)?.replace(/^\d+-/, "") || "未分类";
      const current = result.get(name) ?? [];
      current.push(post);
      result.set(name, current);
    }
    return new Map(Array.from(result.entries()).sort(([nameA], [nameB]) => comparePath(nameA, nameB)).map(([name, items]) => [name, items.sort((a, b) => comparePath(a.slug, b.slug))]));
  }, [visible]);

  useEffect(() => {
    const selected = new URL(window.location.href).searchParams.get("category");
    if (selected && categories.some((item) => item.path === selected)) setCategory(selected);
  }, [categories]);

  function selectCategory(path: string) {
    setCategory(path);
    const url = new URL(window.location.href);
    if (path === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", path);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  return <div className="blog-filter-view">
    <aside className="blog-catalog" aria-label="博客目录">
      <Link className="catalog-home" href="/blog"><span>Blog</span><strong>{posts.length}</strong></Link>
      <label className="catalog-search"><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索文章" aria-label="搜索博客文章" /></label>
      <div className="category-nav">
        <button className={category === "all" ? "active" : ""} onClick={() => selectCategory("all")}><span className="category-chevron" /><span>全部</span><small>({posts.length})</small></button>
        {categories.map(({ path, name }) => {
          const count = posts.filter((post) => post.categoryPath === path || post.categoryPath?.startsWith(`${path}/`)).length;
          const displayName = name.split("/").at(-1)?.replace(/^\d+-/, "") || name;
          return <button key={path} className={category === path ? "active" : ""} onClick={() => selectCategory(path)}><ChevronRight className="category-chevron" aria-hidden="true" /><span>{displayName}</span><small>({count})</small></button>;
        })}
      </div>
    </aside>
    <div id="blog-post-list" aria-label="Post list">
      {Array.from(grouped.entries()).map(([name, items]) => <section className="blog-category-group" key={name}>
        <h2 className="toc-heading"><span>{name}</span></h2>
        <div className="blog-category-posts">{items.map((post) => <Link className="blog-list-link" href={`/blog/${post.slug}`} key={post.id}><span className="list-item-title">{post.title}</span><span className="list-item-meta">{post.pubDate ? date.format(new Date(post.pubDate)) : ""}{post.minutesRead ? ` · ${Math.ceil(post.minutesRead)} min` : ""}<ArrowRight aria-hidden="true" /></span></Link>)}</div>
      </section>)}
      {visible.length === 0 ? <p className="blog-empty">没有找到匹配文章。</p> : null}
    </div>
  </div>;
}
