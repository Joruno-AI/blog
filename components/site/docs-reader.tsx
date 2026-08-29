"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Menu,
  Network,
  PanelLeftOpen,
  PanelRightOpen,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  isValidElement,
  type ComponentPropsWithoutRef,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { ArticleActions } from "@/components/site/article-actions";
import {
  docsArticleUrl,
  docsRawUrl,
  resolveDocsPath,
  type DocsArticle,
  type DocsCatalog,
  type DocsCategory,
  type DocsCourse,
  type DocsSource,
} from "@/lib/docs/catalog";
import { extractArticleHeadings, headingId } from "@/lib/parity/blog-reader";

type LocatedArticle = {
  article: DocsArticle;
  course: DocsCourse;
  category: DocsCategory;
  source: DocsSource;
  index: number;
};

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function normalizeMarkdown(markdown: string) {
  return markdown
    .replace(/<!--(?:.|\n|\r)*?-->/g, "")
    .replace(/^\s*#\s+.+(?:\r?\n)+/, "")
    .trim();
}

function findArticle(catalog: DocsCatalog, path: string, sourceId: string, courseId?: string): LocatedArticle | null {
  const source = catalog.sources.find((item) => item.id === sourceId);
  if (!source) return null;
  for (const category of catalog.categories) {
    for (const course of category.courses) {
      if (course.sourceId !== sourceId || (courseId && course.id !== courseId)) continue;
      const index = course.articles.findIndex((article) => article.path === path);
      if (index >= 0) return { article: course.articles[index], course, category, source, index };
    }
  }
  return null;
}

async function fetchMarkdown(source: DocsSource, path: string, signal: AbortSignal) {
  const urls = [
    docsRawUrl(source, path),
    docsRawUrl(source, path, "https://gcore.jsdelivr.net/gh"),
    docsRawUrl(source, path, "https://raw.githubusercontent.com"),
  ];
  let lastError: Error | null = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`文档源返回 ${response.status}`);
      return await response.text();
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      lastError = error as Error;
    }
  }
  throw lastError ?? new Error("文档正文加载失败");
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const value = nodeText(children).replace(/\n$/, "");
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }
  return (
    <div className="reader-code-block">
      <pre>{children}</pre>
      <button type="button" className="reader-code-copy" onClick={copy} aria-label="复制代码">
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        <span>{copied ? "已复制" : "复制"}</span>
      </button>
    </div>
  );
}

export function DocsReader({ sourceId, path, courseId }: { sourceId: string; path: string; courseId?: string }) {
  const [catalog, setCatalog] = useState<DocsCatalog | null>(null);
  const catalogRef = useRef<DocsCatalog | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [located, setLocated] = useState<LocatedArticle | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courseOpen, setCourseOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [mindMapOpen, setMindMapOpen] = useState(false);

  const loadLocation = useCallback(async (nextPath: string, nextSourceId: string, nextCourseId?: string, replace = false) => {
    setLoading(true);
    setError("");
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      let nextCatalog = catalogRef.current;
      if (!nextCatalog) {
        nextCatalog = await fetch("/docs/catalog.static.json", { signal: controller.signal }).then((response) => {
          if (!response.ok) throw new Error(`课程索引返回 ${response.status}`);
          return response.json() as Promise<DocsCatalog>;
        });
      }
      if (!nextCatalog) throw new Error("课程索引内容为空");
      catalogRef.current = nextCatalog;
      setCatalog(nextCatalog);
      const nextLocated = findArticle(nextCatalog, nextPath, nextSourceId, nextCourseId);
      if (!nextLocated) throw new Error("没有在当前内容快照中找到这篇文档。");
      const source = await fetchMarkdown(nextLocated.source, nextLocated.article.path, controller.signal);
      const content = normalizeMarkdown(source);
      setLocated(nextLocated);
      setMarkdown(content);
      setCourseOpen(false);
      setTocOpen(false);
      const href = docsArticleUrl(nextLocated.article.path, nextLocated.source.id, nextLocated.course.id);
      if (replace) window.history.replaceState({ docsReader: true }, "", href);
      else window.history.pushState({ docsReader: true }, "", href);
      window.sessionStorage.setItem("docs:last-location", href);
      document.title = `${nextLocated.article.displayTitle} | Joruno`;
      window.scrollTo({ top: 0, behavior: replace ? "auto" : "smooth" });
    } catch (loadError) {
      if (requestRef.current === controller && (loadError as Error).name !== "AbortError") {
        setError((loadError as Error).message || "文档正文加载失败");
      }
    } finally {
      if (requestRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLocation(path, sourceId, courseId, true);
    return () => requestRef.current?.abort();
  }, [courseId, loadLocation, path, sourceId]);

  useEffect(() => {
    function onPopState() {
      const url = new URL(window.location.href);
      const nextPath = url.searchParams.get("path");
      if (nextPath) void loadLocation(nextPath, url.searchParams.get("source") || "geektime", url.searchParams.get("course") || undefined, true);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [loadLocation]);

  const headings = useMemo(() => extractArticleHeadings(markdown), [markdown]);
  const articleLookup = useMemo(() => {
    const lookup = new Map<string, { article: DocsArticle; sourceId: string; courseId: string }>();
    for (const category of catalog?.categories ?? []) {
      for (const course of category.courses) {
        for (const article of course.articles) lookup.set(`${course.sourceId}:${article.path}`, { article, sourceId: course.sourceId, courseId: course.id });
      }
    }
    return lookup;
  }, [catalog]);

  const previous = located && located.index > 0 ? located.course.articles[located.index - 1] : null;
  const next = located && located.index < located.course.articles.length - 1 ? located.course.articles[located.index + 1] : null;

  function openArticle(article: DocsArticle) {
    if (!located) return;
    void loadLocation(article.path, located.source.id, located.course.id);
  }

  function heading(level: 2 | 3 | 4 | 5 | 6) {
    return function ReaderHeading({ children }: { children?: ReactNode }) {
      const id = headingId(nodeText(children));
      const Tag = `h${level}` as "h2";
      return <Tag id={id}>{children}<a className="header-anchor" href={`#${id}`} aria-label={`链接到 ${nodeText(children)}`}>#</a></Tag>;
    };
  }

  function MarkdownLink({ href = "", children, ...props }: ComponentPropsWithoutRef<"a">) {
    if (!located || /^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("#") || href.startsWith("mailto:")) {
      return <a href={href} target={href.startsWith("#") ? undefined : "_blank"} rel={href.startsWith("#") ? undefined : "noreferrer"} {...props}>{children}</a>;
    }
    const resolved = resolveDocsPath(located.article.path, href.split("#")[0]);
    const lookupKey = `${located.source.id}:${resolved}`;
    if (articleLookup.has(lookupKey)) {
      return <a href={docsArticleUrl(resolved, located.source.id)} onClick={(event) => {
        event.preventDefault();
        const target = articleLookup.get(lookupKey);
        if (target) void loadLocation(target.article.path, target.sourceId, target.courseId);
      }}>{children}</a>;
    }
    return <a href={docsRawUrl(located.source, resolved)} target="_blank" rel="noreferrer" {...props}>{children}</a>;
  }

  function MarkdownImage({ src = "", alt = "", ...props }: ComponentPropsWithoutRef<"img">) {
    if (!located || typeof src !== "string") return null;
    const url = /^(?:[a-z]+:)?\/\//i.test(src) || src.startsWith("data:")
      ? src
      : docsRawUrl(located.source, resolveDocsPath(located.article.path, src));
    // The source repositories own these immutable, commit-pinned course assets.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} loading="lazy" {...props} />;
  }

  return (
    <section className={`geektime-reader docs-reader-shell${courseOpen ? " reader-course-mobile-open" : ""}${tocOpen ? " reader-toc-mobile-open" : ""}`} data-loading={loading ? "" : undefined} aria-busy={loading}>
      <div className="reader-layout">
        <aside id="reader-course-panel" className="reader-course-panel" data-reader-panel-ready data-reader-panel-open={courseOpen ? "" : undefined}>
          <div className="reader-aside-heading"><Menu aria-hidden="true" /><Link href="/docs">本课程</Link><span data-course-count>{located ? `${located.course.articles.length} 篇` : ""}</span></div>
          <ol className="reader-course-list">
            {located?.course.articles.map((article) => (
              <li className="reader-course-item" key={article.path}>
                <button type="button" className="reader-course-link" aria-current={article.path === located.article.path ? "page" : undefined} onClick={() => openArticle(article)}>
                  <span className="reader-course-index">{article.sequence}</span><strong>{article.displayTitle}</strong>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <div className="reader-main">
          <nav className="reader-breadcrumb" aria-label="面包屑">
            <Link href="/docs">Docs</Link><span aria-hidden="true">/</span><Link href={located ? `/docs/course/${located.course.id}` : "/docs"}>{located?.course.name || "课程"}</Link>
          </nav>

          {loading ? <div className="reader-state" aria-live="polite"><span className="sr-only">正在从内容快照加载正文</span><div className="reader-skeleton" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <span key={index} />)}</div></div> : null}
          {error ? <div className="reader-state is-error" role="alert"><strong>正文加载失败</strong><p>{error}</p><Link className="reader-error-back" href="/docs">返回文档库</Link></div> : null}

          {!loading && !error && located ? (
            <>
              <header className="reader-header">
                <div className="reader-header-content">
                  <h1>{located.article.displayTitle}</h1>
                  <div className="reader-actions">
                    <ArticleActions markdown={markdown} url={docsArticleUrl(located.article.path, located.source.id, located.course.id)} title={located.article.displayTitle} />
                    <button type="button" className="reader-mindmap-trigger" onClick={() => setMindMapOpen(true)}><Network aria-hidden="true" /><span>思维导图</span></button>
                  </div>
                </div>
              </header>

              <article className="prose reader-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    a: MarkdownLink,
                    img: MarkdownImage,
                    h2: heading(2), h3: heading(3), h4: heading(4), h5: heading(5), h6: heading(6),
                    pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
                  }}
                >{markdown}</ReactMarkdown>
              </article>

              <nav className="reader-neighbors" aria-label="章节导航">
                {previous ? <a href={docsArticleUrl(previous.path, located.source.id, located.course.id)} onClick={(event) => { event.preventDefault(); openArticle(previous); }}><span><ChevronLeft aria-hidden="true" />上一篇</span><strong>{previous.displayTitle}</strong></a> : <span />}
                {next ? <a href={docsArticleUrl(next.path, located.source.id, located.course.id)} onClick={(event) => { event.preventDefault(); openArticle(next); }}><span>下一篇<ChevronRight aria-hidden="true" /></span><strong>{next.displayTitle}</strong></a> : null}
              </nav>
            </>
          ) : null}
        </div>

        <aside id="reader-toc-panel" className="reader-toc-panel" data-reader-panel-ready data-reader-panel-open={tocOpen ? "" : undefined}>
          <div className="reader-aside-heading"><Menu aria-hidden="true" /><span>本页目录</span></div>
          <nav className="reader-toc-list" aria-label="本页目录">
            {headings.map((item, index) => <a className="reader-toc-link" data-depth={item.depth} href={`#${item.id}`} key={`${item.id}-${index}`}>{item.text}</a>)}
          </nav>
        </aside>
      </div>

      <div className="reader-floating-controls" aria-label="阅读面板">
        <button type="button" className="reader-panel-toggle reader-course-toggle" onClick={() => setCourseOpen((value) => !value)} aria-label="打开课程目录" aria-expanded={courseOpen}><PanelLeftOpen aria-hidden="true" /></button>
        <button type="button" className="reader-panel-toggle reader-toc-toggle" onClick={() => setTocOpen((value) => !value)} aria-label="打开本页目录" aria-expanded={tocOpen}><PanelRightOpen aria-hidden="true" /></button>
      </div>

      {mindMapOpen ? (
        <dialog open className="reader-mindmap-dialog" aria-labelledby="reader-mindmap-title">
          <section className="reader-mindmap-shell">
            <header className="reader-mindmap-header"><div className="reader-mindmap-heading"><span className="reader-mindmap-kicker">文章导图</span><h2 id="reader-mindmap-title">{located?.article.displayTitle}</h2></div><button type="button" className="reader-mindmap-close" onClick={() => setMindMapOpen(false)} aria-label="关闭思维导图"><X aria-hidden="true" /></button></header>
            <div className="reader-mindmap-viewport"><ol className="reader-mindmap-tree">{headings.map((item, index) => <li className={`depth-${item.depth}`} key={`${item.id}-${index}`}><a href={`#${item.id}`} onClick={() => setMindMapOpen(false)}>{item.text}</a></li>)}</ol></div>
            <p className="reader-mindmap-hint">点击节点即可跳转到对应章节。</p>
          </section>
        </dialog>
      ) : null}
    </section>
  );
}
