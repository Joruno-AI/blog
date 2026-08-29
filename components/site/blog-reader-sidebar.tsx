"use client";

import Link from "next/link";
import { BookOpen, ChevronDown, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { compareAstroPaths, type BlogReaderPost } from "@/lib/parity/blog-reader";

export function BlogReaderSidebar({ posts, currentId }: { posts: BlogReaderPost[]; currentId: string }) {
  const current = posts.find((post) => post.id === currentId);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => new Set(current?.categoryPath ? [current.categoryPath] : []));
  const categories = useMemo(() => {
    const groups = new Map<string, { name: string; posts: BlogReaderPost[] }>();
    for (const post of posts) {
      const group = groups.get(post.categoryPath) ?? { name: post.categoryNamePath, posts: [] };
      group.posts.push(post);
      groups.set(post.categoryPath, group);
    }
    return Array.from(groups, ([path, group]) => ({ path, ...group }))
      .sort((a, b) => compareAstroPaths(a.path, b.path));
  }, [posts]);
  const needle = query.trim().toLocaleLowerCase();

  function toggle(path: string) {
    setExpanded((value) => {
      const next = new Set(value);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return (
    <aside className="reader-catalog" aria-label="博客目录">
      <nav>
        <Link className="reader-catalog-home" href="/blog"><BookOpen aria-hidden="true" /><span>Blog</span><small>{posts.length}</small></Link>
        <label className="reader-catalog-search"><Search aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="搜索文章" aria-label="搜索博客文章" /></label>
        <Link className="reader-category-all" href="/blog"><span>▦</span><strong>全部文章</strong><small>({posts.length})</small></Link>
        <ul className="reader-category-list">
          {categories.map((group) => {
            const active = group.path === current?.categoryPath;
            const matching = group.posts.filter((post) => !needle || post.title.toLocaleLowerCase().includes(needle));
            const isExpanded = expanded.has(group.path) || Boolean(needle && matching.length);
            if (needle && matching.length === 0) return null;
            return <li key={group.path}>
              <div className={`reader-category-row${active ? " active" : ""}`}>
                <button type="button" onClick={() => toggle(group.path)} aria-expanded={isExpanded} aria-label={`${isExpanded ? "收起" : "展开"}${group.name}`}>{isExpanded ? <ChevronDown /> : <ChevronRight />}</button>
                <Link href={`/blog?category=${encodeURIComponent(group.path)}`}>{group.name.split("/").at(-1)?.replace(/^\d+-/, "")}</Link>
                <small>({group.posts.length})</small>
              </div>
              {isExpanded ? <ul className="reader-post-list">{matching.map((post) => <li key={post.id}><Link className={post.id === currentId ? "active" : ""} aria-current={post.id === currentId ? "page" : undefined} href={`/blog/${post.slug}`}>{post.title}</Link></li>)}</ul> : null}
            </li>;
          })}
        </ul>
      </nav>
    </aside>
  );
}
