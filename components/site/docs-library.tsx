"use client";

import { Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { type DocsCatalog, type DocsCatalogSummary } from "@/lib/docs/catalog";
import {
  docsReaderUrl,
  rememberDocsLocation,
  searchDocsCatalog,
  type DocsSearchResult,
} from "@/lib/parity/docs";

const DISPLAY_LIMIT = 60;

export function DocsLibrary({ catalog }: { catalog: DocsCatalogSummary }) {
  const searchRootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const catalogPromiseRef = useRef<Promise<DocsCatalog> | null>(null);
  const latestQueryRef = useRef("");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<DocsSearchResult[]>([]);
  const [status, setStatus] = useState("");
  const [resultsVisible, setResultsVisible] = useState(false);

  const getCatalog = useCallback(() => {
    if (!catalogPromiseRef.current) {
      catalogPromiseRef.current = fetch("/docs/catalog.json?v=3").then((response) => {
        if (!response.ok) throw new Error("无法加载搜索索引");
        return response.json() as Promise<DocsCatalog>;
      });
    }
    return catalogPromiseRef.current;
  }, []);

  useEffect(() => {
    latestQueryRef.current = query;
    const keyword = query.trim();
    if (!keyword) {
      setMatches([]);
      setStatus("");
      setResultsVisible(false);
      return;
    }

    setStatus("正在检索…");
    const timer = window.setTimeout(() => {
      void getCatalog()
        .then((fullCatalog) => {
          if (latestQueryRef.current !== query) return;
          const nextMatches = searchDocsCatalog(fullCatalog, query);
          const displayed = nextMatches.slice(0, DISPLAY_LIMIT);
          setMatches(displayed);
          if (displayed.length === 0) {
            setStatus("没有找到匹配的课程或章节");
            setResultsVisible(false);
            return;
          }
          setStatus(
            `找到 ${nextMatches.length.toLocaleString("zh-CN")} 条结果${
              nextMatches.length > displayed.length ? `，显示前 ${displayed.length} 条` : ""
            }`,
          );
          setResultsVisible(true);
        })
        .catch((error: unknown) => {
          if (latestQueryRef.current !== query) return;
          setMatches([]);
          setResultsVisible(false);
          setStatus(error instanceof Error ? error.message : "搜索暂时不可用");
        });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [getCatalog, query]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA"].includes((event.target as HTMLElement | null)?.tagName || "")
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!searchRootRef.current?.contains(event.target as Node)) setResultsVisible(false);
    }

    document.addEventListener("keydown", handleShortcut);
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("keydown", handleShortcut);
      document.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!window.location.hash) return;
    void document.fonts.ready.then(() => scrollToCategory(window.location.hash));
  }, []);

  function clearSearch() {
    setQuery("");
    setStatus("");
    setMatches([]);
    setResultsVisible(false);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function rememberResult(event: ReactMouseEvent<HTMLDivElement>) {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>("a[href]");
    if (!link) return;
    const url = new URL(link.href);
    const path = url.searchParams.get("path");
    if (!path) return;
    rememberDocsLocation(
      path,
      url.searchParams.get("source") || "geektime",
      url.searchParams.get("course") || undefined,
    );
  }

  function scrollToCategory(hash: string) {
    const id = decodeURIComponent(hash.slice(1));
    const target = document.getElementById(id);
    if (!target) return;
    const navHeight = document.querySelector(".nav-header")?.getBoundingClientRect().height || 0;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 24;
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    window.requestAnimationFrame(() => {
      root.style.scrollBehavior = previousBehavior;
    });
  }

  function handleCategoryClick(event: ReactMouseEvent<HTMLElement>) {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    event.preventDefault();
    const hash = new URL(link.href).hash;
    window.history.pushState({}, "", hash);
    scrollToCategory(hash);
  }

  return (
    <>
      <header className="prose mx-auto text-center docs-library-header">
        <h1>Docs</h1>
        <p className="docs-library-subtitle">来自多个资料源、以课程为单位整理的技术学习资料</p>
      </header>

      <div className="geektime-shell docs-library-shell max-w-[86rem]">
        <section className="geektime-overview" aria-label="文档库概览">
          <p>从分类进入课程，再按章节阅读。两套资料统一检索和阅读，并与博客文章分开管理。</p>
          <dl className="geektime-stats" aria-label="文档统计">
            <div><dt>{catalog.stats.categories}</dt><dd>个分类</dd></div>
            <div><dt>{catalog.stats.courses}</dt><dd>门课程</dd></div>
            <div><dt>{catalog.stats.articles.toLocaleString("zh-CN")}</dt><dd>篇章节</dd></div>
          </dl>
        </section>

        <div className="geektime-search" data-catalog-url="/docs/catalog.json?v=3" ref={searchRootRef}>
          <label className="geektime-search-box">
            <Search aria-hidden="true" />
            <span className="sr-only">搜索课程和章节</span>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索课程或章节，例如 React、Nest、分布式"
              autoComplete="off"
            />
            <button
              type="button"
              className="geektime-search-clear"
              aria-label="清空搜索"
              title="清空搜索"
              hidden={!query}
              onClick={clearSearch}
            >
              <X aria-hidden="true" />
            </button>
          </label>
          <div className="geektime-search-status" aria-live="polite">{status}</div>
          <div
            className="geektime-search-results"
            hidden={!resultsVisible}
            onClick={rememberResult}
          >
            {matches.map((result) => (
              <a className="geektime-search-result" href={result.href} key={`${result.kind}:${result.href}`}>
                <span className="geektime-search-result-copy">
                  <span className="geektime-search-result-title">{result.title}</span>
                  <span className="geektime-search-result-meta">{result.meta}</span>
                </span>
                <span className="geektime-search-result-kind">{result.kind}</span>
              </a>
            ))}
          </div>
        </div>

        <nav className="geektime-category-nav" aria-label="知识方向" onClick={handleCategoryClick}>
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
                  <a
                    className="geektime-course-card"
                    href={course.firstArticle ? docsReaderUrl(course.firstArticle.path, course.sourceId, course.id) : "/docs/"}
                    key={`${course.sourceId}-${course.id}`}
                    onClick={() => {
                      if (course.firstArticle) rememberDocsLocation(course.firstArticle.path, course.sourceId, course.id);
                    }}
                  >
                    <span className="geektime-course-name">{course.name}</span>
                    <span className="geektime-course-meta">
                      {`${course.articleCount} 篇`}
                      <span className="geektime-course-arrow" aria-hidden="true" />
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
