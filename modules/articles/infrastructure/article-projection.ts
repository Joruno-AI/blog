import { and, eq, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db } from "@/lib/db";
import {
  articles,
  resourceCategories,
  resourceRevisions,
  resources,
  resourceTags,
} from "@/lib/db/schema";

export type ArticleProjection = {
  categoryId: string | null;
  tagIds: string[];
  toc: boolean;
  share: boolean;
  giscus: boolean;
  search: boolean;
  minutesRead: number | null;
};

const hasOwn = (value: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(value, key);

export function parseArticleMetadata(metadataJson: string) {
  try {
    const value: unknown = JSON.parse(metadataJson);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

/**
 * Returns an immutable article projection only when every public field is
 * explicitly represented by the revision. A partial projection must never be
 * completed from mutable current side tables during an anonymous read.
 */
export function articleProjectionFromMetadata(
  metadata: Record<string, unknown>,
): ArticleProjection | null {
  if (!hasOwn(metadata, "categoryId")
    || !hasOwn(metadata, "tagIds")
    || !hasOwn(metadata, "toc")
    || !hasOwn(metadata, "share")
    || !hasOwn(metadata, "giscus")
    || !hasOwn(metadata, "search")
    || !hasOwn(metadata, "minutesRead")) {
    return null;
  }
  if (metadata.categoryId !== null && typeof metadata.categoryId !== "string") return null;
  if (!Array.isArray(metadata.tagIds)
    || metadata.tagIds.some((tagId) => typeof tagId !== "string")) return null;
  if (typeof metadata.toc !== "boolean"
    || typeof metadata.share !== "boolean"
    || typeof metadata.giscus !== "boolean"
    || typeof metadata.search !== "boolean") return null;
  if (metadata.minutesRead !== null && typeof metadata.minutesRead !== "number") return null;

  return {
    categoryId: metadata.categoryId as string | null,
    tagIds: [...new Set(metadata.tagIds as string[])],
    toc: metadata.toc,
    share: metadata.share,
    giscus: metadata.giscus,
    search: metadata.search,
    minutesRead: metadata.minutesRead as number | null,
  };
}

export function articleProjectionMetadata(
  metadata: Record<string, unknown>,
  projection: ArticleProjection,
) {
  return {
    ...metadata,
    categoryId: projection.categoryId,
    tagIds: [...new Set(projection.tagIds)],
    toc: projection.toc,
    share: projection.share,
    giscus: projection.giscus,
    search: projection.search,
    minutesRead: projection.minutesRead,
  };
}

export async function readArticleProjection(
  resourceId: string,
  database: typeof db = db,
): Promise<ArticleProjection> {
  const [articleRows, categoryRows, tagRows] = await Promise.all([
    database
      .select({
        toc: articles.toc,
        share: articles.share,
        giscus: articles.giscus,
        search: articles.searchable,
        minutesRead: articles.readingMinutes,
      })
      .from(articles)
      .where(eq(articles.resourceId, resourceId))
      .limit(1),
    database
      .select({ categoryId: resourceCategories.categoryId })
      .from(resourceCategories)
      .where(eq(resourceCategories.resourceId, resourceId))
      .orderBy(resourceCategories.categoryId),
    database
      .select({ tagId: resourceTags.tagId })
      .from(resourceTags)
      .where(eq(resourceTags.resourceId, resourceId))
      .orderBy(resourceTags.tagId),
  ]);
  const article = articleRows[0];
  if (!article) throw new Error(`Article projection ${resourceId} was not found.`);
  if (categoryRows.length > 1) {
    throw new Error(`Article projection ${resourceId} has more than one category.`);
  }
  return {
    categoryId: categoryRows[0]?.categoryId ?? null,
    tagIds: tagRows.map((row) => row.tagId),
    toc: article.toc,
    share: article.share,
    giscus: article.giscus,
    search: article.search,
    minutesRead: article.minutesRead,
  };
}

/**
 * Guards both scalar and set-valued side projections. The malformed JSON
 * sentinel deliberately aborts the surrounding D1 batch, making stale
 * projection reads fail closed instead of partially updating taxonomy.
 */
export function articleProjectionGuard(
  resourceId: string,
  projection: ArticleProjection,
  database: typeof db = db,
): BatchItem<"sqlite"> {
  const categoryIdsJson = JSON.stringify(
    projection.categoryId ? [projection.categoryId] : [],
  );
  const tagIdsJson = JSON.stringify([...new Set(projection.tagIds)].sort());
  return database.select({
    guard: sql`json_extract(
      CASE WHEN
        EXISTS (
          SELECT 1 FROM articles AS live_article
          WHERE live_article.resource_id = ${resourceId}
            AND live_article.toc = ${projection.toc ? 1 : 0}
            AND live_article.share = ${projection.share ? 1 : 0}
            AND live_article.giscus = ${projection.giscus ? 1 : 0}
            AND live_article.searchable = ${projection.search ? 1 : 0}
            AND live_article.reading_minutes IS ${projection.minutesRead}
        )
        AND coalesce((
          SELECT json_group_array(category_id)
          FROM (
            SELECT category_id
            FROM resource_categories
            WHERE resource_id = ${resourceId}
            ORDER BY category_id
          )
        ), '[]') = ${categoryIdsJson}
        AND coalesce((
          SELECT json_group_array(tag_id)
          FROM (
            SELECT tag_id
            FROM resource_tags
            WHERE resource_id = ${resourceId}
            ORDER BY tag_id
          )
        ), '[]') = ${tagIdsJson}
      THEN '{}'
      ELSE 'ARTICLE_PROJECTION_CONFLICT'
      END,
      '$'
    )`,
  }).from(sql`(SELECT 1)`);
}

export function articleProjectionWriteStatements(
  resourceId: string,
  projection: ArticleProjection,
  database: typeof db = db,
): BatchItem<"sqlite">[] {
  const statements: BatchItem<"sqlite">[] = [
    database
      .insert(articles)
      .values({
        resourceId,
        toc: projection.toc,
        share: projection.share,
        giscus: projection.giscus,
        searchable: projection.search,
        readingMinutes: projection.minutesRead,
      })
      .onConflictDoUpdate({
        target: articles.resourceId,
        set: {
          toc: projection.toc,
          share: projection.share,
          giscus: projection.giscus,
          searchable: projection.search,
          readingMinutes: projection.minutesRead,
        },
      }),
    database
      .delete(resourceCategories)
      .where(eq(resourceCategories.resourceId, resourceId)),
    database
      .delete(resourceTags)
      .where(eq(resourceTags.resourceId, resourceId)),
  ];
  if (projection.categoryId) {
    statements.push(database.insert(resourceCategories).values({
      resourceId,
      categoryId: projection.categoryId,
    }));
  }
  if (projection.tagIds.length > 0) {
    const tagIdsJson = JSON.stringify([...new Set(projection.tagIds)].sort());
    statements.push(database.insert(resourceTags).select(
      database
        .select({
          resourceId: sql<string>`${resourceId}`.as("resource_id"),
          tagId: sql<string>`value`.as("tag_id"),
        })
        .from(sql`json_each(${tagIdsJson})`),
    ));
  }
  return statements;
}

export function articlePublishedPointerGuard(
  resourceId: string,
  publishedRevisionId: string | null,
  database: typeof db = db,
): BatchItem<"sqlite"> {
  return database.select({
    guard: sql`json_extract(
      CASE WHEN EXISTS (
        SELECT 1 FROM resources AS live_resource
        WHERE live_resource.id = ${resourceId}
          AND live_resource.published_revision_id IS ${publishedRevisionId}
      )
      THEN '{}'
      ELSE 'ARTICLE_PUBLICATION_POINTER_CONFLICT'
      END,
      '$'
    )`,
  }).from(sql`(SELECT 1)`);
}

export function articleRevisionMetadataGuard(
  revisionId: string,
  metadataJson: string,
  database: typeof db = db,
): BatchItem<"sqlite"> {
  return database.select({
    guard: sql`json_extract(
      CASE WHEN EXISTS (
        SELECT 1 FROM resource_revisions AS live_revision
        WHERE live_revision.id = ${revisionId}
          AND live_revision.metadata_json = ${metadataJson}
      )
      THEN '{}'
      ELSE 'ARTICLE_REVISION_METADATA_CONFLICT'
      END,
      '$'
    )`,
  }).from(sql`(SELECT 1)`);
}

/** Freeze a legacy published revision exactly once before current side tables
 * are repointed to a new draft. Callers must reject current!=published legacy
 * rows because their old public projection can no longer be inferred safely.
 */
export function freezeLegacyPublishedArticleStatement(input: {
  revisionId: string;
  metadataJson: string;
  projection: ArticleProjection;
}, database: typeof db = db): BatchItem<"sqlite"> | null {
  const metadata = parseArticleMetadata(input.metadataJson);
  if (articleProjectionFromMetadata(metadata)) return null;
  const frozenMetadataJson = JSON.stringify(
    articleProjectionMetadata(metadata, input.projection),
  );
  return database
    .update(resourceRevisions)
    .set({ metadataJson: frozenMetadataJson })
    .where(and(
      eq(resourceRevisions.id, input.revisionId),
      eq(resourceRevisions.metadataJson, input.metadataJson),
    ));
}

export async function readArticlePublicationSnapshot(
  resourceId: string,
  database: typeof db = db,
) {
  const [row] = await database
    .select({
      type: resources.type,
      currentRevisionId: resources.currentRevisionId,
      publishedRevisionId: resources.publishedRevisionId,
      publishedMetadataJson: resourceRevisions.metadataJson,
    })
    .from(resources)
    .leftJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.publishedRevisionId),
    )
    .where(eq(resources.id, resourceId))
    .limit(1);
  return row ?? null;
}

/**
 * Freezes the exact article revision and its normalized side projection for a
 * publication transaction. The returned statements are safe to prepend to
 * publishCurrentRevision's D1 batch.
 */
export async function prepareArticlePublicationTransaction(
  resourceId: string,
  expectedCurrentRevisionId?: string,
  database: typeof db = db,
) {
  const [row] = await database
    .select({
      type: resources.type,
      currentRevisionId: resources.currentRevisionId,
      metadataJson: resourceRevisions.metadataJson,
    })
    .from(resources)
    .leftJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.currentRevisionId),
    )
    .where(eq(resources.id, resourceId))
    .limit(1);
  if (!row || row.type !== "article") return null;
  if (!row.currentRevisionId || row.metadataJson === null) {
    throw new Error("The current article revision is missing.");
  }
  if (expectedCurrentRevisionId !== undefined
    && row.currentRevisionId !== expectedCurrentRevisionId) {
    throw new Error("Resource changed while publication was being prepared.");
  }

  const metadata = parseArticleMetadata(row.metadataJson);
  let projection = articleProjectionFromMetadata(metadata);
  const additionalStatements: BatchItem<"sqlite">[] = [];
  if (!projection) {
    // Compatibility path for a pre-snapshot revision. The side projection is
    // frozen into that revision in the same transaction that publishes it.
    projection = await readArticleProjection(resourceId, database);
    const freeze = freezeLegacyPublishedArticleStatement({
      revisionId: row.currentRevisionId,
      metadataJson: row.metadataJson,
      projection,
    }, database);
    if (freeze) additionalStatements.push(freeze);
  }

  return {
    expectedCurrentRevisionId: row.currentRevisionId,
    guardStatements: [
      articleRevisionMetadataGuard(row.currentRevisionId, row.metadataJson, database),
      articleProjectionGuard(resourceId, projection, database),
    ],
    additionalStatements,
  };
}
