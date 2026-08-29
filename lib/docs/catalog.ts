import catalogSummary from "@/lib/docs/catalog-summary.json";

export type DocsSource = {
  id: string;
  name: string;
  source: string;
  repository: string;
  branch: string;
  commit: string;
  generatedAt: string;
};

export type DocsArticle = {
  title: string;
  displayTitle: string;
  sequence: string;
  path: string;
  bytes: number;
};

export type DocsCourse = {
  id: string;
  sourceId: string;
  name: string;
  path: string;
  articles: DocsArticle[];
};

export type DocsCategory = {
  id: string;
  name: string;
  courseCount: number;
  articleCount: number;
  courses: DocsCourse[];
};

export type DocsCatalog = {
  sources: DocsSource[];
  generatedAt: string;
  stats: { categories: number; courses: number; articles: number };
  categories: DocsCategory[];
};

export type DocsCatalogSummary = typeof catalogSummary;

export const docsCatalogSummary = catalogSummary;

export function docsArticleUrl(path: string, sourceId = "geektime", courseId?: string) {
  const params = new URLSearchParams({ source: sourceId, path });
  if (courseId) params.set("course", courseId);
  return `/docs/read?${params.toString()}`;
}

export function docsCourseUrl(course: DocsCatalogSummary["categories"][number]["courses"][number]) {
  return course.firstArticle
    ? docsArticleUrl(course.firstArticle.path, course.sourceId, course.id)
    : "/docs";
}

export function docsCourseById(id: string) {
  return docsCatalogSummary.categories.flatMap((category) => category.courses).find((course) => course.id === id);
}

export function docsRawUrl(source: DocsSource, path: string, host = "https://cdn.jsdelivr.net/gh") {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  if (host.includes("raw.githubusercontent.com")) {
    return `${host}/${source.repository}/${source.commit}/${encodedPath}`;
  }
  return `${host}/${source.repository}@${source.commit}/${encodedPath}`;
}

export function resolveDocsPath(currentPath: string, relativePath: string) {
  const baseDirectory = currentPath.split("/").slice(0, -1).join("/");
  return decodeURIComponent(new URL(relativePath, `https://docs.local/${baseDirectory}/`).pathname.replace(/^\//, ""));
}
