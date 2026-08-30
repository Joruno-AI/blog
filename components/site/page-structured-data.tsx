type PageStructuredDataProps = {
  path: string;
  title: string;
  description?: string | null;
  publishedAt?: Date | null;
  tags?: string[];
  category?: string | null;
  image?: string | null;
};

/** Keep JSON-LD data inside its script element even when CMS text is hostile. */
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

export function PageStructuredData({ path, title, description, publishedAt, tags = [], category, image }: PageStructuredDataProps) {
  const pathname = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(pathname, "https://wangshengliang.cn/").href;
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 0, name: "Home", item: "https://wangshengliang.cn/" },
      ...segments.map((segment, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `${segment.charAt(0).toUpperCase()}${segment.slice(1).replaceAll("-", " ")}`,
        item: new URL(`/${segments.slice(0, index + 1).join("/")}`, "https://wangshengliang.cn/").href,
      })),
    ],
  };
  const data = publishedAt ? {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    ...(image ? { image: new URL(image, "https://wangshengliang.cn/").href } : {}),
    url,
    datePublished: publishedAt.toISOString(),
    ...(description ? { description } : {}),
    ...(tags.length ? { keywords: tags.join(", ") } : {}),
    ...(category ? { articleSection: category } : {}),
    author: { "@type": "Person", name: "Joruno Jobāna", url: "https://wangshengliang.cn/" },
    publisher: {
      "@type": "Organization",
      name: "Joruno",
      url: "https://wangshengliang.cn/",
      logo: { "@type": "ImageObject", url: "https://wangshengliang.cn/joruno.png" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  } : {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    url,
    ...(description ? { description } : {}),
    publisher: { "@type": "Organization", name: "Joruno", url: "https://wangshengliang.cn/" },
    breadcrumb,
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
    {publishedAt ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} /> : null}
  </>;
}
