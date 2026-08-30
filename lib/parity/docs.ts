import {
  docsRawUrl,
  type DocsArticle,
  type DocsCatalog,
  type DocsCategory,
  type DocsCourse,
  type DocsSource,
} from "@/lib/docs/catalog";

export type LocatedDocsArticle = {
  article: DocsArticle;
  course: DocsCourse;
  category: DocsCategory;
  source: DocsSource;
  index: number;
};

export type DocsSearchResult = {
  title: string;
  meta: string;
  kind: "课程" | "章节";
  href: string;
  score: number;
};

export type DocsHeading = {
  depth: 2 | 3 | 4;
  id: string;
  line: number;
  text: string;
};

const COURSE_COMMENTS_HEADING = /^精选留言(?:[（(]\d+[）)])?$/;

export function docsReaderUrl(path: string, sourceId = "geektime", courseId?: string) {
  const params = new URLSearchParams({ source: sourceId, path });
  if (courseId) params.set("course", courseId);
  return `/docs/read/?${params.toString()}`;
}

export function rememberDocsLocation(path: string, sourceId: string, courseId?: string) {
  try {
    sessionStorage.setItem("geektime:last-article-path", path);
    sessionStorage.setItem("geektime:last-source-id", sourceId);
    if (courseId) sessionStorage.setItem("geektime:last-course-id", courseId);
    else sessionStorage.removeItem("geektime:last-course-id");
  } catch {
    // Reading and navigation still work when storage is unavailable.
  }
}

export function findDocsArticle(
  catalog: DocsCatalog,
  path: string,
  sourceId: string,
  courseId?: string,
): LocatedDocsArticle | null {
  const source = catalog.sources.find((item) => item.id === sourceId);
  if (!source) return null;

  for (const category of catalog.categories) {
    for (const course of category.courses) {
      if ((course.sourceId || "geektime") !== sourceId) continue;
      if (courseId && course.id !== courseId) continue;
      const index = course.articles.findIndex((article) => article.path === path);
      if (index >= 0) {
        return { article: course.articles[index], course, category, source, index };
      }
    }
  }
  return null;
}

export function searchDocsCatalog(catalog: DocsCatalog, rawQuery: string): DocsSearchResult[] {
  const query = rawQuery.trim().toLocaleLowerCase("zh-CN");
  if (!query) return [];

  const matches: DocsSearchResult[] = [];
  for (const category of catalog.categories) {
    for (const course of category.courses) {
      const sourceId = course.sourceId || "geektime";
      const courseName = course.name.toLocaleLowerCase("zh-CN");
      if (courseName.includes(query)) {
        const firstArticle = course.articles[0];
        matches.push({
          title: course.name,
          meta: `${category.name} · ${course.articles.length} 篇章节`,
          kind: "课程",
          href: firstArticle ? docsReaderUrl(firstArticle.path, sourceId, course.id) : "/docs/",
          score: courseName.startsWith(query) ? 0 : 1,
        });
      }

      for (const article of course.articles) {
        const displayTitle = `${article.sequence} ${article.displayTitle}`;
        const articleTitle = displayTitle.toLocaleLowerCase("zh-CN");
        if (!articleTitle.includes(query)) continue;
        matches.push({
          title: displayTitle,
          meta: `${category.name} / ${course.name}`,
          kind: "章节",
          href: docsReaderUrl(article.path, sourceId, course.id),
          score: articleTitle.startsWith(query) ? 2 : 3,
        });
      }
    }
  }

  return matches.sort(
    (a, b) => a.score - b.score || a.title.localeCompare(b.title, "zh-CN"),
  );
}

function isCourseCommentsHeading(value: string) {
  const normalized = value
    .replace(/^\s{0,3}#{1,6}\s*/, "")
    .replace(/^\s*>\s*/, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\*\*|__/g, "")
    .replace(/[\s\u200b\ufeff]/g, "");
  return COURSE_COMMENTS_HEADING.test(normalized);
}

export function normalizeDocsMarkdown(markdown: string) {
  const withoutComments = markdown.replace(/<!--(?:.|\n|\r)*?-->/g, "");
  const lines = withoutComments.split(/\r?\n/);
  const commentsIndex = lines.findIndex(isCourseCommentsHeading);
  const articleLines = commentsIndex >= 0 ? lines.slice(0, commentsIndex) : lines;

  // The reader owns the page title. The source parser removes the first
  // rendered H1 even when an introduction appears before it, so find the
  // first ATX H1 outside fenced code rather than only inspecting line one.
  let fenced = false;
  for (let index = 0; index < articleLines.length; index += 1) {
    const line = articleLines[index];
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced && /^\s{0,3}#\s+/.test(line)) {
      articleLines.splice(index, 1);
      break;
    }
  }
  return articleLines.join("\n").trim();
}

export function docsHeadingId(value: string) {
  return (
    value
      .trim()
      .toLocaleLowerCase("zh-CN")
      .replace(/\s+/g, "-")
      .replace(/[^\w\-\u4e00-\u9fff]/g, "") || "section"
  );
}

function plainHeadingText(value: string) {
  return value
    .replace(/\s+#+\s*$/, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .trim();
}

export function extractDocsHeadings(markdown: string): DocsHeading[] {
  const headings: DocsHeading[] = [];
  const used = new Set<string>();
  let fenced = false;

  for (const [lineIndex, line] of markdown.split(/\r?\n/).entries()) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = line.match(/^\s{0,3}(#{2,4})\s+(.+?)\s*$/);
    if (!match) continue;
    const text = plainHeadingText(match[2]) || "未命名章节";
    const base = docsHeadingId(text);
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    headings.push({ depth: match[1].length as 2 | 3 | 4, id, line: lineIndex + 1, text });
  }
  return headings;
}

export function shouldRetryDocsStatus(status: number) {
  return [403, 404, 408, 425, 429].includes(status) || status >= 500;
}

export function docsMarkdownUrls(source: DocsSource, path: string) {
  return [
    docsRawUrl(source, path),
    docsRawUrl(source, path, "https://gcore.jsdelivr.net/gh"),
    docsRawUrl(source, path, "https://raw.githubusercontent.com"),
  ];
}
