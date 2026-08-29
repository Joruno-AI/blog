import {
  and,
  countDistinct,
  desc,
  eq,
  inArray,
  like,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  articles,
  categories,
  resourceCategories,
  resourceRevisions,
  resources,
  resourceTags,
  tags,
  users,
} from "@/lib/db/schema";
import { getCategoryWithDescendantIds } from "./categories";
import { articleResourceIdCandidates } from "@/modules/articles/domain/id";

type ArticleQueryOptions = {
  limit?: number;
  offset?: number;
  ids?: string[];
  slug?: string;
  categoryIds?: string[];
  draft?: boolean;
  search?: string;
  publishedRevision?: boolean;
};

function parseMetadata(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function hasMetadataField(metadata: Record<string, unknown>, field: string) {
  return Object.prototype.hasOwnProperty.call(metadata, field);
}

function metadataCategoryId(metadata: Record<string, unknown>) {
  if (!hasMetadataField(metadata, "categoryId")) return undefined;
  return typeof metadata.categoryId === "string" ? metadata.categoryId : null;
}

function metadataTagIds(metadata: Record<string, unknown>) {
  if (!hasMetadataField(metadata, "tagIds")) return undefined;
  if (!Array.isArray(metadata.tagIds)) return [];
  return metadata.tagIds.filter((id): id is string => typeof id === "string");
}

function categoryCondition(categoryIds: string[], publishedRevision: boolean): SQL {
  if (!publishedRevision) return inArray(resourceCategories.categoryId, categoryIds);

  return or(
    inArray(
      sql<string>`json_extract(${resourceRevisions.metadataJson}, '$.categoryId')`,
      categoryIds
    ),
    and(
      sql`json_type(${resourceRevisions.metadataJson}, '$.categoryId') IS NULL`,
      inArray(resourceCategories.categoryId, categoryIds)
    )
  )!;
}

async function queryArticles(options: ArticleQueryOptions = {}) {
  const {
    limit = 20,
    offset = 0,
    ids,
    slug,
    categoryIds,
    draft,
    search,
    publishedRevision = false,
  } = options;
  const conditions: SQL[] = [
    eq(resources.type, "article"),
    ne(resources.status, "archived"),
  ];
  if (ids?.length) conditions.push(inArray(resources.id, ids));
  if (slug) conditions.push(eq(resources.slug, slug));
  if (draft === true) conditions.push(eq(resources.status, "draft"));
  if (draft === false) conditions.push(eq(resources.status, "published"));
  if (search) conditions.push(like(resourceRevisions.title, `%${search}%`));
  if (categoryIds?.length) {
    conditions.push(categoryCondition(categoryIds, publishedRevision));
  }

  const revisionPointer = publishedRevision
    ? resources.publishedRevisionId
    : resources.currentRevisionId;
  const rows = await db
    .select({
      id: resources.id,
      title: resourceRevisions.title,
      slug: resourceRevisions.slug,
      metadataJson: resourceRevisions.metadataJson,
      content: resourceRevisions.content,
      excerpt: resourceRevisions.description,
      status: resources.status,
      visibility: resourceRevisions.visibility,
      pubDate: resources.publishedAt,
      createdAt: resources.createdAt,
      updatedAt: resources.updatedAt,
      authorId: resources.authorId,
      categoryId: resourceCategories.categoryId,
      toc: articles.toc,
      share: articles.share,
      giscus: articles.giscus,
      searchable: articles.searchable,
      readingMinutes: articles.readingMinutes,
    })
    .from(resources)
    .innerJoin(resourceRevisions, eq(resourceRevisions.id, revisionPointer))
    .leftJoin(articles, eq(articles.resourceId, resources.id))
    .leftJoin(
      resourceCategories,
      eq(resourceCategories.resourceId, resources.id)
    )
    .where(and(...conditions))
    .orderBy(
      desc(resources.publishedAt),
      desc(resources.updatedAt),
      desc(resources.id)
    )
    .limit(Math.min(Math.max(limit, 1), 1_000))
    .offset(Math.max(offset, 0));

  if (rows.length === 0) return [];
  const preparedRows = rows.map((row) => ({
    ...row,
    metadata: parseMetadata(row.metadataJson),
  }));
  const resourceIds = [...new Set(preparedRows.map((row) => row.id))];
  const authorIds = rows
    .map((row) => row.authorId)
    .filter((id): id is string => Boolean(id));

  const categoryRelationRows: Array<{
    resourceId: string;
    categoryId: string;
  }> = [];
  const tagRelationRows: Array<{
    resourceId: string;
    tagId: string;
  }> = [];
  // D1 accepts at most 100 bound parameters per statement. Hydrate large
  // Studio result sets in deterministic chunks instead of emitting one giant
  // IN clause.
  for (let index = 0; index < resourceIds.length; index += 80) {
    const chunk = resourceIds.slice(index, index + 80);
    const [chunkCategories, chunkTags] = await Promise.all([
      db
      .select({
        resourceId: resourceCategories.resourceId,
        categoryId: resourceCategories.categoryId,
      })
      .from(resourceCategories)
      .where(inArray(resourceCategories.resourceId, chunk)),
      db
      .select({
        resourceId: resourceTags.resourceId,
        tagId: resourceTags.tagId,
      })
      .from(resourceTags)
      .where(inArray(resourceTags.resourceId, chunk)),
    ]);
    categoryRelationRows.push(...chunkCategories);
    tagRelationRows.push(...chunkTags);
  }

  const categoryRelationByResource = new Map(
    categoryRelationRows.map((row) => [row.resourceId, row.categoryId])
  );
  const tagRelationByResource = new Map<string, string[]>();
  for (const row of tagRelationRows) {
    const current = tagRelationByResource.get(row.resourceId) ?? [];
    current.push(row.tagId);
    tagRelationByResource.set(row.resourceId, current);
  }

  const categoryIdsToHydrate = new Set<string>();
  const tagIdsToHydrate = new Set<string>();
  for (const row of preparedRows) {
    const snapshotCategoryId = publishedRevision
      ? metadataCategoryId(row.metadata)
      : undefined;
    const categoryId = snapshotCategoryId === undefined
      ? categoryRelationByResource.get(row.id) ?? null
      : snapshotCategoryId;
    if (categoryId) categoryIdsToHydrate.add(categoryId);

    const snapshotTagIds = publishedRevision
      ? metadataTagIds(row.metadata)
      : undefined;
    for (const tagId of snapshotTagIds ?? tagRelationByResource.get(row.id) ?? []) {
      tagIdsToHydrate.add(tagId);
    }
  }

  const categoryRows: Array<typeof categories.$inferSelect> = [];
  const tagRows: Array<typeof tags.$inferSelect> = [];
  const categoryIdsList = [...categoryIdsToHydrate];
  const tagIdsList = [...tagIdsToHydrate];
  for (let index = 0; index < categoryIdsList.length; index += 80) {
    categoryRows.push(...await db
      .select()
      .from(categories)
      .where(inArray(categories.id, categoryIdsList.slice(index, index + 80))));
  }
  for (let index = 0; index < tagIdsList.length; index += 80) {
    tagRows.push(...await db
      .select()
      .from(tags)
      .where(inArray(tags.id, tagIdsList.slice(index, index + 80))));
  }
  const uniqueAuthorIds = [...new Set(authorIds)];
  const authorRows: Array<typeof users.$inferSelect> = [];
  for (let index = 0; index < uniqueAuthorIds.length; index += 80) {
    authorRows.push(...await db
      .select()
      .from(users)
      .where(inArray(users.id, uniqueAuthorIds.slice(index, index + 80))));
  }

  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
  const tagById = new Map(tagRows.map((tag) => [tag.id, tag]));
  const authorById = new Map(authorRows.map((author) => [author.id, author]));

  return preparedRows.map((row) => {
    const metadata = row.metadata;
    const snapshotCategoryId = publishedRevision
      ? metadataCategoryId(metadata)
      : undefined;
    const categoryId = snapshotCategoryId === undefined
      ? categoryRelationByResource.get(row.id) ?? null
      : snapshotCategoryId;
    const category = categoryId ? categoryById.get(categoryId) ?? null : null;
    const snapshotTagIds = publishedRevision ? metadataTagIds(metadata) : undefined;
    const effectiveTagIds = snapshotTagIds ?? tagRelationByResource.get(row.id) ?? [];
    const metadataBoolean = (field: string, fallback: boolean) =>
      publishedRevision && typeof metadata[field] === "boolean"
        ? metadata[field] as boolean
        : fallback;
    const metadataNumber = (field: string, fallback: number | null) =>
      publishedRevision && typeof metadata[field] === "number"
        ? metadata[field] as number
        : fallback;
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      subtitle: typeof metadata.subtitle === "string" ? metadata.subtitle : null,
      content: row.content,
      excerpt: row.excerpt,
      ogImage: typeof metadata.ogImage === "string" ? metadata.ogImage : null,
      draft: row.status !== "published",
      status: row.status,
      visibility: row.visibility,
      toc: metadataBoolean("toc", row.toc ?? true),
      share: metadataBoolean("share", row.share ?? true),
      giscus: metadataBoolean("giscus", row.giscus ?? true),
      search: metadataBoolean("search", row.searchable ?? true),
      radio: metadata.radio === true,
      video: metadata.video === true,
      platform: typeof metadata.platform === "string" ? metadata.platform : null,
      podcastAudioUrl: null,
      podcastNarrator: null,
      podcastDuration: null,
      podcastSize: null,
      podcastStatus: "none" as const,
      podcastScript: null,
      podcastSourceHash: null,
      podcastError: null,
      podcastAttempts: 0,
      podcastGeneratedAt: null,
      minutesRead: metadataNumber("minutesRead", row.readingMinutes),
      pubDate: row.pubDate,
      lastModDate: row.updatedAt,
      categoryId,
      authorId: row.authorId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      category,
      author: row.authorId ? authorById.get(row.authorId) ?? null : null,
      postTags: effectiveTagIds.flatMap((tagId) => {
        const tag = tagById.get(tagId);
        if (!tag) return [];
        return [{
        postId: row.id,
        tagId: tag.id,
        tag: {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          createdAt: tag.createdAt,
        },
        }];
      }),
    };
  });
}

export async function getPosts(options?: {
  limit?: number;
  offset?: number;
  categoryId?: string;
  draft?: boolean;
  search?: string;
}) {
  const rows = await queryArticles({
    ...options,
    categoryIds: options?.categoryId ? [options.categoryId] : undefined,
    publishedRevision: options?.draft === false,
  });
  return rows.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    draft: post.draft,
    status: post.status,
    pubDate: post.pubDate,
    updatedAt: post.updatedAt,
    categoryId: post.categoryId,
    categoryName: post.category?.name ?? null,
  }));
}

export async function getPostById(id: string) {
  const ids = articleResourceIdCandidates(id);
  const rows = await queryArticles({ ids, limit: 2 });
  return rows[0] ?? null;
}

export async function getPostBySlug(slug: string) {
  const rows = await queryArticles({
    slug,
    limit: 1,
    draft: false,
    publishedRevision: true,
  });
  return rows[0] ?? null;
}

export async function getPostsCount(options?: {
  categoryId?: string;
  draft?: boolean;
}) {
  const publishedRevision = options?.draft === false;
  const conditions: SQL[] = [
    eq(resources.type, "article"),
    ne(resources.status, "archived"),
  ];
  if (options?.draft === true) conditions.push(eq(resources.status, "draft"));
  if (options?.draft === false) conditions.push(eq(resources.status, "published"));
  if (options?.categoryId) {
    conditions.push(categoryCondition([options.categoryId], publishedRevision));
  }

  const revisionPointer = publishedRevision
    ? resources.publishedRevisionId
    : resources.currentRevisionId;

  const [result] = await db
    .select({ total: countDistinct(resources.id) })
    .from(resources)
    .innerJoin(resourceRevisions, eq(resourceRevisions.id, revisionPointer))
    .leftJoin(
      resourceCategories,
      eq(resourceCategories.resourceId, resources.id)
    )
    .where(and(...conditions));
  return result?.total ?? 0;
}

export async function getPostsWithContent(options?: {
  limit?: number;
  offset?: number;
  categoryId?: string;
  draft?: boolean;
}) {
  return queryArticles({
    ...options,
    categoryIds: options?.categoryId ? [options.categoryId] : undefined,
    publishedRevision: options?.draft === false,
  });
}

export async function getPostsWithCategoryPath(options?: {
  limit?: number;
  offset?: number;
  categoryId?: string;
  categoryPath?: string;
  draft?: boolean;
}) {
  const allCategories = await db.query.categories.findMany();
  const categoryMap = new Map(
    allCategories.map((category) => [category.id, category])
  );
  const buildPath = (id: string) => {
    const slugs: string[] = [];
    const names: string[] = [];
    let currentId: string | null = id;
    while (currentId) {
      const category = categoryMap.get(currentId);
      if (!category) break;
      slugs.unshift(category.slug);
      names.unshift(category.name);
      currentId = category.parentId;
    }
    return { slugPath: slugs.join("/"), namePath: names.join("/") };
  };

  let categoryId = options?.categoryId;
  if (options?.categoryPath) {
    categoryId = allCategories.find(
      (category) => buildPath(category.id).slugPath === options.categoryPath
    )?.id;
    if (!categoryId) return [];
  }
  const categoryIds = categoryId
    ? await getCategoryWithDescendantIds(categoryId)
    : undefined;
  const rows = await queryArticles({
    ...options,
    categoryIds,
    publishedRevision: options?.draft === false,
  });

  return rows.map((post) => {
    const paths = post.categoryId
      ? buildPath(post.categoryId)
      : { slugPath: null, namePath: null };
    return {
      ...post,
      categoryPath: paths.slugPath,
      categoryNamePath: paths.namePath,
    };
  });
}
