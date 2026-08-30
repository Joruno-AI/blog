import scenesData from "@/lib/parity/data/agent-scenes.json";

import { docsCatalogSummary } from "@/lib/docs/catalog";

export const ASTRO_SITE = {
  origin: "https://wangshengliang.cn",
  website: "https://wangshengliang.cn/",
  title: "Joruno",
  description: "Joruno 的个人博客，记录 Web 开发、Agent 工具与编程实践。",
  author: "Joruno Jobāna",
} as const;

/**
 * Page routes emitted by the final Astro build at d1ec7b0. API routes and
 * status-code pages were not included by @astrojs/sitemap.
 */
export const ASTRO_STATIC_PAGE_PATHS = [
  "/",
  "/agent",
  "/agent/about",
  "/agent/all",
  "/agent/analyzer",
  "/agent/compare",
  "/agent/masters",
  "/agent/repository",
  "/agent/scenes",
  "/agent/trending",
  "/blog",
  "/changelog",
  "/docs",
  "/docs/read",
  "/feeds",
  "/music",
  "/photos",
  "/projects",
  "/prs",
  "/releases",
  "/shorts",
  "/streams",
] as const;

export const ASTRO_MANIFEST = {
  id: "/",
  name: "Astro AntfuStyle Theme",
  short_name: "AntfuStyle",
  description: "A customizable, feature-rich Astro theme for blog and portfolio",
  icons: [
    { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
    { src: "/icon-512.png", type: "image/png", sizes: "512x512" },
    {
      src: "/icon-mask.png",
      type: "image/png",
      sizes: "512x512",
      purpose: "maskable",
    },
  ],
  scope: "/",
  start_url: "/",
  display: "standalone",
  theme_color: "#fff",
  background_color: "#fff",
} as const;

export const ASTRO_ROBOTS_TXT = [
  "User-agent: *",
  "Allow: /",
  "Sitemap: https://wangshengliang.cn/sitemap-index.xml",
  "",
].join("\n");

type SitemapResourceRoute = {
  path: string;
  type: string;
};

type SearchResource = {
  id: string;
  type: string;
  title: string;
  path: string;
  description: string | null;
  metadataJson: string;
};

export type AstroSearchIndexItem = {
  title: string;
  description: string;
  tags: string[];
  collection: "blog" | "changelog";
  url: string;
};

export type AstroRssResource = {
  title: string;
  path: string;
  description: string | null;
  publishedAt: Date | null;
};

function parseMetadata(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function withTrailingSlash(path: string) {
  const pathname = path.startsWith("/") ? path : `/${path}`;
  return pathname === "/" || pathname.endsWith("/") ? pathname : `${pathname}/`;
}

export function absoluteAstroPageUrl(path: string) {
  return new URL(withTrailingSlash(path), ASTRO_SITE.website).href;
}

function astroChangelogPath(path: string) {
  const prefix = "/changelog/";
  if (!path.startsWith(prefix)) return path;
  return `${prefix}${path.slice(prefix.length).replaceAll(".", "")}`;
}

function astroDynamicPagePath(route: SitemapResourceRoute) {
  if (route.type === "article" && route.path.startsWith("/blog/")) return route.path;
  if (route.type === "short" && route.path.startsWith("/shorts/")) return route.path;
  if (route.type === "document" && route.path.startsWith("/changelog/")) {
    // Astro's route parameter serialization stripped periods from changelog
    // content IDs (`1.0.0.md` -> `/changelog/100/`). The CMS keeps the
    // original source path, so translate it at the public boundary.
    return astroChangelogPath(route.path);
  }
  if (route.type !== "tool" || !route.path.startsWith("/agent/")) return null;
  return route.path.split("/").filter(Boolean).length === 3 ? route.path : null;
}

export function buildAstroSitemap(
  resources: SitemapResourceRoute[],
  options: {
    sceneSlugs?: string[];
    courseIds?: string[];
  } = {}
) {
  const sceneSlugs = options.sceneSlugs ?? scenesData.scenes.map((scene) => scene.slug);
  const courseIds = options.courseIds
    ?? docsCatalogSummary.categories.flatMap((category) => category.courses.map((course) => course.id));
  const paths = [
    ...ASTRO_STATIC_PAGE_PATHS,
    ...sceneSlugs.map((slug) => `/agent/scenes/${slug}`),
    ...courseIds.map((id) => `/docs/course/${id}`),
    ...resources.flatMap((route) => {
      const path = astroDynamicPagePath(route);
      return path ? [path] : [];
    }),
  ];

  return [...new Set(paths.map(absoluteAstroPageUrl))]
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
    .map((url) => ({ url }));
}

export function buildAstroSitemapIndexXml() {
  return '<?xml version="1.0" encoding="UTF-8"?>'
    + '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    + `<sitemap><loc>${ASTRO_SITE.origin}/sitemap-0.xml</loc></sitemap>`
    + '</sitemapindex>';
}

export function buildAstroSitemapXml(entries: ReadonlyArray<{ url: string }>) {
  const urls = entries
    .map(({ url }) => `<url><loc>${escapeXml(url)}</loc></url>`)
    .join("");

  return '<?xml version="1.0" encoding="UTF-8"?>'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
    + 'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" '
    + 'xmlns:xhtml="http://www.w3.org/1999/xhtml" '
    + 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" '
    + 'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">'
    + urls
    + '</urlset>';
}

export function buildAstroSearchIndex(
  resources: SearchResource[],
  articleTags: ReadonlyMap<string, readonly string[]> = new Map()
): AstroSearchIndexItem[] {
  const items = resources.flatMap<AstroSearchIndexItem>((resource) => {
    const collection = resource.type === "article" && resource.path.startsWith("/blog/")
      ? "blog"
      : resource.type === "document" && resource.path.startsWith("/changelog/")
        ? "changelog"
        : null;
    if (!collection) return [];

    const metadata = parseMetadata(resource.metadataJson);
    const redirect = typeof metadata.redirect === "string"
      ? metadata.redirect.trim()
      : typeof metadata.redirectUrl === "string"
        ? metadata.redirectUrl.trim()
        : "";
    const tags = collection === "blog"
      ? [...(articleTags.get(resource.id) ?? stringList(metadata.tags))]
      : stringList(metadata.tags);

    return [{
      title: resource.title,
      description: resource.description ?? "",
      tags,
      collection,
      url: redirect || withTrailingSlash(
        collection === "changelog" ? astroChangelogPath(resource.path) : resource.path
      ),
    }];
  });

  // Astro's content loader emits collection entries in their path order.
  // Keep that stable contract even though the unified CMS query is ordered by
  // publication date.
  return items.sort((a, b) => {
    if (a.collection !== b.collection) return a.collection === "blog" ? -1 : 1;
    return a.url < b.url ? -1 : a.url > b.url ? 1 : 0;
  });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function buildAstroRssXml(resources: AstroRssResource[], generatedAt = new Date()) {
  const items = [...resources]
    .sort((a, b) => {
      const byDate = (b.publishedAt?.valueOf() ?? 0) - (a.publishedAt?.valueOf() ?? 0);
      if (byDate !== 0) return byDate;
      return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
    })
    .map((resource) => {
      const url = absoluteAstroPageUrl(resource.path);
      return [
        "<item>",
        `<title>${escapeXml(resource.title)}</title>`,
        `<link>${escapeXml(url)}</link>`,
        `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
        resource.description
          ? `<description>${escapeXml(resource.description)}</description>`
          : "",
        resource.publishedAt
          ? `<pubDate>${resource.publishedAt.toUTCString()}</pubDate>`
          : "",
        `<author>${escapeXml(ASTRO_SITE.author)}</author>`,
        "</item>",
      ].filter(Boolean).join("");
    })
    .join("");

  // Match @astrojs/rss' compact XML serialization byte-for-byte (apart from
  // the expected build timestamp).
  return `<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet href="/rss-styles.xsl" type="text/xsl"?><rss version="2.0"><channel><title>${escapeXml(ASTRO_SITE.title)}</title><description>${escapeXml(ASTRO_SITE.description)}</description><link>${ASTRO_SITE.website}</link><lastBuildDate>${generatedAt.toUTCString()}</lastBuildDate><image><title>${escapeXml(ASTRO_SITE.title)}</title><url>${ASTRO_SITE.origin}/icon-512.png</url><link>${ASTRO_SITE.website}</link></image>${items}</channel></rss>`;
}

export async function collectAllPages<T>(
  readPage: (offset: number, limit: number) => Promise<T[]>,
  pageSize = 100
) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError("pageSize must be a positive integer");
  }
  const items: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await readPage(offset, pageSize);
    items.push(...page);
    if (page.length < pageSize) return items;
  }
}
