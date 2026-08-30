export const astroPublicRouteContract = [
  "/", "/404", "/blog", "/blog/[...slug]", "/docs", "/docs/read",
  "/docs/course/[id]", "/docs/catalog.json", "/projects", "/photos",
  "/photos/photos.[hash].json", "/shorts", "/shorts/[...slug]", "/music",
  "/music/data.json", "/music/lyrics/[album].json", "/streams", "/agent",
  "/agent/[...id]", "/agent/about", "/agent/all", "/agent/analyzer",
  "/agent/compare", "/agent/masters", "/agent/repository", "/agent/trending",
  "/agent/scenes", "/agent/scenes/[slug]", "/agent/suggest-index.json",
  "/changelog", "/changelog/[slug]", "/feeds", "/prs", "/releases",
  "/rss.xml", "/search-index.json", "/og-images/[...slug].png",
  "/giscus/[theme].css", "/app.webmanifest", "/robots.txt",
  "/sitemap-index.xml", "/sitemap-0.xml",
] as const;

export const excludedProductRoutes = ["/products", "/api/products"] as const;
export const excludedMemberRoutes = ["/register"] as const;

/** Public pages from the interim platform redesign that never existed in Astro. */
export const excludedInterimPublicRoutes = [
  "/knowledge",
  "/search",
  "/tools",
  "/music/albums/[slug]",
  "/projects/[...slug]",
  "/docs/[...slug]",
] as const;
