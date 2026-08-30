import type { Metadata } from "next";

const SITE_NAME = "wangshengliang.cn";
const AUTHOR = "Joruno Jobāna";

function withTrailingSlash(path: string) {
  return path.endsWith("/") ? path : `${path}/`;
}

function resolvedTitle(title: string) {
  const rawTitle = title === "Joruno" ? title : `${title} - Joruno`;
  return rawTitle.length > 60 ? title : rawTitle;
}

type LegacyMetadataOptions = {
  title: string;
  description: string;
  path: string;
  image?: string | false;
  article?: {
    publishedAt?: Date | null;
    tags?: string[];
  };
};

/** Metadata emitted by the historical Astro Head component. */
export function legacyMetadata({
  title,
  description,
  path,
  image = "/og-images/og-image.png",
  article,
}: LegacyMetadataOptions): Metadata {
  const canonical = withTrailingSlash(path);
  const absoluteCanonical = new URL(canonical, "https://wangshengliang.cn").toString();
  const socialTitle = resolvedTitle(title);
  const documentTitle: Metadata["title"] = socialTitle === title
    ? { absolute: title }
    : title;
  const images = image === false
    ? []
    : [{ url: image, width: 1200, height: 630, alt: title }];
  const twitterImages = image === false ? [] : [{ url: image, alt: title }];

  return {
    title: documentTitle,
    description,
    keywords: article?.tags?.length ? article.tags : undefined,
    alternates: { canonical },
    openGraph: article
      ? {
          type: "article",
          url: canonical,
          title: socialTitle,
          description,
          siteName: SITE_NAME,
          locale: "zh_CN",
          publishedTime: article.publishedAt?.toISOString(),
          authors: [AUTHOR],
          tags: article.tags,
          images,
        }
      : {
          type: "website",
          url: canonical,
          title: socialTitle,
          description,
          siteName: SITE_NAME,
          locale: "zh_CN",
          images,
        },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: twitterImages,
    },
    // Next's Twitter metadata type has no URL field, while Astro emitted one.
    other: { "twitter:url": absoluteCanonical },
  };
}

export function legacyCanonicalPath(path: string) {
  return withTrailingSlash(path);
}
