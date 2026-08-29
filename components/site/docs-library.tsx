"use client";

import { ArrowUpRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  docsArticleUrl,
  docsCourseUrl,
  type DocsCatalog,
  type DocsCatalogSummary,
} from "@/lib/docs/catalog";

type SearchResult = {
  href: string;
  title: string;
  meta: string;
  kind: "课程" | "章节";
};

export function DocsLibrary({ catalog }: { catalog: DocsCatalogSummary }) {
  const [query, setQuery] = useState("");
  const [fullCatalog, setFullCatalog] = useState<DocsCatalog | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/docs/catalog.static.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Docs catalog ${response.status}`);
        return response.json() as Promise<DocsCatalog>;
      })
      .then(setFullCatalog)
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setLoadError(true);
      });
    return () => controller.abort();
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const keyword = query.trim().toLocaleLowerCase("zh-CN");
    if (!keyword) return [];
    const matches: SearchResult[] = [];

    for (const category of catalog.categories) {
      for (const course of category.courses) {
        if (course.name.toLocaleLowerCase("zh-CN").includes(keyword)) {
          matches.push({
            href: docsCourseUrl(course),
            title: course.name,
            meta: `${category.name} · ${course.articleCount} 篇`,
            kind: "课程",
          });
        }
      }
    }

    if (fullCatalog) {
      for (const category of fullCatalog.categories) {
        for (const course of category.courses) {
          for (const article of course.articles) {
            if (!article.title.toLocaleLowerCase("zh-CN").includes(keyword)) continue;
            matches.push({
              href: docsArticleUrl(article.path, course.sourceId, course.id),
              title: article.displayTitle,
              meta: `${course.name} · ${article.sequence}`,
              kind: "章节",
            });
            if (matches.length >= 24) return matches;
          }
        }
      }
    }

    return matches.slice(0, 24);
  }, [catalog, fullCatalog, query]);

  const searching = query.trim().length > 0;

  return (
    <section className="geektime-shell docs-library-shell">
      <header className="prose standard-header text-center">
        <h1>Docs</h1>
        <p className="subtitle">来自多个资料源、以课程为单位整理的技术学习资料</p>
      </header>

      <section className="geektime-overview" aria-label="文档库概览">
        <p>从分类进入课程，再按章节阅读。两套资料统一检索和阅读，并与博客文章分开管理。</p>
        <dl className="geektime-stats" aria-label="文档统计">
          <div><dt>{catalog.stats.categories}</dt><dd>个分类</dd></div>
          <div><dt>{catalog.stats.courses}</dt><dd>门课程</dd></div>
          <div><dt>{catalog.stats.articles.toLocaleString("zh-CN")}</dt><dd>篇章节</dd></div>
        </dl>
      </section>

      <div className="geektime-search">
        <label className="geektime-search-box">
          <Search aria-hidden="true" />
          <span className="sr-only">搜索课程和章节</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索课程或章节，例如 React、Nest、分布式"
            autoComplete="off"
          />
          {query ? (
            <button type="button" className="geektime-search-clear" aria-label="清空搜索" title="清空搜索" onClick={() => setQuery("")}>
              <X aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <div className="geektime-search-status" aria-live="polite">
          {searching
            ? loadError
              ? `找到 ${results.length} 门匹配课程，章节索引暂时未加载`
              : fullCatalog
                ? `找到 ${results.length} 个结果`
                : "正在载入完整章节索引…"
            : ""}
        </div>
        {searching ? (
          <div className="geektime-search-results">
            {results.length ? results.map((result, index) => (
              <Link className="geektime-search-result" href={result.href} key={`${result.kind}-${result.href}-${index}`}>
                <span className="geektime-search-result-copy">
                  <span className="geektime-search-result-title">{result.title}</span>
                  <span className="geektime-search-result-meta">{result.meta}</span>
                </span>
                <span className="geektime-search-result-kind">{result.kind}</span>
              </Link>
            )) : <p className="docs-search-empty">没有找到匹配的课程或章节。</p>}
          </div>
        ) : null}
      </div>

      <nav className="geektime-category-nav" aria-label="知识方向">
        {catalog.categories.map((category) => <a href={`#${category.id}`} key={category.id}>{category.name}</a>)}
      </nav>

      <div className="geektime-category-list">
        {catalog.categories.map((category, categoryIndex) => (
          <section id={category.id} className="geektime-category" key={category.id}>
            <header>
              <div className="geektime-category-number">{String(categoryIndex + 1).padStart(2, "0")}</div>
              <div>
                <h2>{category.name}</h2>
                <p>{category.courseCount} 门课程 · {category.articleCount.toLocaleString("zh-CN")} 篇章节</p>
              </div>
            </header>
            <div className="geektime-course-grid">
              {category.courses.map((course) => (
                <Link className="geektime-course-card" href={docsCourseUrl(course)} key={`${course.sourceId}-${course.id}`}>
                  <span className="geektime-course-name">{course.name}</span>
                  <span className="geektime-course-meta">
                    {course.articleCount} 篇
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
