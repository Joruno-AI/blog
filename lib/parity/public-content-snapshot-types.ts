import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";

export const PUBLIC_CONTENT_SNAPSHOT_VERSION = 1 as const;

/**
 * Fingerprint of the reviewed production corpus. Exact parity assertions fail
 * on any revision change so a regenerated snapshot must deliberately update
 * this baseline after its public endpoint bytes have been reviewed.
 */
export const ASTRO_PUBLIC_CONTENT_BASELINE_REVISION = "d318f75056b1e715";

export type PublicContentResourceSummary = {
  id: string;
  type: "document" | "photo" | "project" | "short";
  title: string;
  slug: string;
  path: string;
  publicPath: string;
  description: string | null;
  visibility: "public";
  coverAssetId: string | null;
  publishedAt: string | null;
  updatedAt: string;
  revisionId: string;
  version: number;
  contentFormat: PublishedResource["contentFormat"];
  metadataJson: string;
  contentLength: number;
  minutesRead: number;
  tags: string[];
  tagNames: string[];
  toc: boolean;
  share: boolean;
};

export type PublicContentArticleSummary = {
  id: string;
  type: "article";
  title: string;
  slug: string;
  path: string;
  publicPath: string;
  description: string | null;
  visibility: "public";
  publishedAt: string | null;
  updatedAt: string;
  revisionId: string;
  version: number;
  contentFormat: PublishedResource["contentFormat"];
  contentLength: number;
  subtitle: string | null;
  ogImage: string | false | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryPath: string | null;
  categoryNamePath: string | null;
  tags: string[];
  tagNames: string[];
  minutesRead: number;
  toc: boolean;
  share: boolean;
  giscus: boolean;
  search: boolean;
};

export type PublicContentSummarySnapshot = {
  schemaVersion: typeof PUBLIC_CONTENT_SNAPSHOT_VERSION;
  contentRevision: string;
  counts: {
    articles: number;
    changelog: number;
    shorts: number;
    projects: number;
    streams: number;
    photos: number;
  };
  articles: PublicContentArticleSummary[];
  changelog: PublicContentResourceSummary[];
  shorts: PublicContentResourceSummary[];
  projects: PublicContentResourceSummary[];
  streams: PublicContentResourceSummary[];
  photos: PublicContentResourceSummary[];
  photoCollection: { hash: string; file: string };
};
