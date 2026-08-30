import publicContentSummary from "@/lib/parity/data/public-content-summary.json";

import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";
import {
  PUBLIC_CONTENT_SNAPSHOT_VERSION,
  type PublicContentResourceSummary,
  type PublicContentSummarySnapshot,
} from "@/lib/parity/public-content-snapshot-types";

export * from "@/lib/parity/public-content-snapshot-types";

const snapshot = publicContentSummary as PublicContentSummarySnapshot;

if (snapshot.schemaVersion !== PUBLIC_CONTENT_SNAPSHOT_VERSION) {
  throw new Error(`Unsupported public content snapshot version: ${snapshot.schemaVersion}`);
}

const articlesByPath = new Map(snapshot.articles.map((article) => [article.path, article]));
const changelogByPublicPath = new Map(snapshot.changelog.map((resource) => [resource.publicPath.replace(/\/$/, ""), resource]));
const shortsByPath = new Map(snapshot.shorts.map((resource) => [resource.path, resource]));

export function getPublicContentSnapshot() {
  return snapshot;
}

export function getSnapshotArticle(path: string) {
  return articlesByPath.get(path) ?? null;
}

export function getSnapshotChangelog(publicPath: string) {
  return changelogByPublicPath.get(publicPath.replace(/\/$/, "")) ?? null;
}

export function getSnapshotShort(path: string) {
  return shortsByPath.get(path) ?? null;
}

export function snapshotResourceDate(value: string | null) {
  return value ? new Date(value) : null;
}

/** Hydrate the small, body-free build record for existing presentation mappers. */
export function snapshotPublishedResource(
  resource: PublicContentResourceSummary,
): PublishedResource {
  return {
    id: resource.id,
    type: resource.type,
    title: resource.title,
    slug: resource.slug,
    path: resource.path,
    description: resource.description,
    visibility: resource.visibility,
    coverAssetId: resource.coverAssetId,
    publishedAt: snapshotResourceDate(resource.publishedAt),
    revisionId: resource.revisionId,
    version: resource.version,
    content: "",
    contentFormat: resource.contentFormat,
    metadataJson: resource.metadataJson,
  };
}

export function snapshotPublishedResources(
  resources: readonly PublicContentResourceSummary[],
) {
  return resources.map(snapshotPublishedResource);
}
