import selectedAgentData from "@/lib/parity/data/agent-selected-summaries.json";
import publicContentSummary from "@/lib/parity/data/public-content-summary.json";
import {
  buildAstroRssXml,
  buildAstroSearchIndex,
  buildAstroSitemap,
  buildAstroSitemapXml,
  type AstroRssResource,
} from "@/lib/parity/public-endpoints";
import {
  PUBLIC_CONTENT_SNAPSHOT_VERSION,
  type PublicContentSummarySnapshot,
} from "@/lib/parity/public-content-snapshot-types";

type SelectedAgentData = {
  items: Record<string, unknown>;
};

const snapshot = publicContentSummary as PublicContentSummarySnapshot;
const selectedAgents = selectedAgentData as SelectedAgentData;

if (snapshot.schemaVersion !== PUBLIC_CONTENT_SNAPSHOT_VERSION) {
  throw new Error(`Unsupported public content snapshot version: ${snapshot.schemaVersion}`);
}

/**
 * Build-only projection for the immutable Astro public endpoint contracts.
 * It intentionally imports the body-free summary, never the 5MB build-only
 * body corpus. `force-static` route handlers evaluate these functions during
 * `next build`, and OpenNext serves their output from Workers Static Assets.
 */
export function buildSnapshotSitemapXml() {
  const resources = [
    ...snapshot.articles.map(({ path }) => ({ type: "article", path })),
    ...snapshot.changelog.map(({ path }) => ({ type: "document", path })),
    ...snapshot.shorts.map(({ path }) => ({ type: "short", path })),
    ...Object.keys(selectedAgents.items).map((path) => ({ type: "tool", path })),
  ];
  return buildAstroSitemapXml(buildAstroSitemap(resources));
}

export function buildSnapshotSearchIndexJson() {
  const articles = snapshot.articles.map((article) => ({
    ...article,
    // Article tags are already projected from the normalized tag relation.
    // No article metadata field is needed by the legacy search serializer.
    metadataJson: "{}",
  }));
  const tags = new Map(
    snapshot.articles.map((article) => [article.id, article.tagNames] as const),
  );
  return JSON.stringify(
    buildAstroSearchIndex([...articles, ...snapshot.changelog], tags),
  );
}

export function snapshotRssResources(): AstroRssResource[] {
  return snapshot.articles.map((article) => ({
    title: article.title,
    path: article.path,
    description: article.description,
    publishedAt: article.publishedAt ? new Date(article.publishedAt) : null,
  }));
}

export function buildSnapshotRssXml(generatedAt: Date) {
  return buildAstroRssXml(snapshotRssResources(), generatedAt);
}

export const PUBLIC_CONTENT_ENDPOINT_REVISION = snapshot.contentRevision;
