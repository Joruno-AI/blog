import {
  and,
  countDistinct,
  desc,
  eq,
  inArray,
  like,
  ne,
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
import {
  articleProjectionFromMetadata,
  type ArticleProjection,
} from "@/modules/articles/infrastructure/article-projection";

type ArticleQueryOptions = {
  limit?: number;
  offset?: number;
  ids?: string[];
  slug?: string;
  categoryIds?: string[];
  draft?: boolean;
  search?: string;
  publishedRevision?: boolean;
  publishedVisibility?: PublishedArticleVisibilityScope;
};

export type PublishedArticleVisibilityScope = "public" | "public-or-unlisted";

/**
 * Public article reads must agree on both the resource row and its immutable
 * published revision. Checking both columns prevents a stale visibility
 * pointer from exposing a revision that the editor marked private.
 */
export function publishedArticleVisibilityCondition(
  scope: PublishedArticleVisibilityScope = "public"
): SQL {
  const allowed = scope === "public-or-unlisted"
    ? ["public", "unlisted"] as const
    : ["public"] as const;

  return and(
    inArray(resources.visibility, [...allowed]),
    inArray(resourceRevisions.visibility, [...allowed])
  )!;
}

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

const SAFE_LEGACY_PUBLIC_PROJECTION: ArticleProjection = {
  categoryId: null,
  tagIds: [],
  toc: true,
  share: true,
  giscus: true,
  search: true,
  minutesRead: null,
};

/** Public callers consume only the immutable revision snapshot. A legacy
 * partial row fails closed to stable defaults instead of consulting mutable
 * current side tables. Migration 0003 and the Studio save compatibility path
 * freeze complete projections for real published rows. */
export function publishedArticleProjection(
  metadata: Record<string, unknown>,
): ArticleProjection {
  return articleProjectionFromMetadata(metadata)
    ?? SAFE_LEGACY_PUBLIC_PROJECTION;
}

function categoryCondition(categoryIds: string[], publishedRevision: boolean): SQL {
  if (!publishedRevision) return inArray(resourceCategories.categoryId, categoryIds);

  return inArray(
    sql<string>`json_extract(${resourceRevisions.metadataJson}, '$.categoryId')`,
    categoryIds
  );
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
    publishedVisibility,
  } = options;
  const conditions: SQL[] = [
    eq(resources.type, "article"),
    ne(resources.status, "archived"),
  ];
  if (ids?.length) conditions.push(inArray(resources.id, ids));
  if (slug) conditions.push(eq(resources.slug, slug));
  if (draft === true) conditions.push(eq(resources.status, "draft"));
  if (draft === false) conditions.push(eq(resources.status, "published"));
  if (publishedVisibility) {
    conditions.push(publishedArticleVisibilityCondition(publishedVisibility));
  }
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
    const publishedProjection = publishedRevision
      ? publishedArticleProjection(row.metadata)
      : null;
    const categoryId = publishedRevision
      ? publishedProjection!.categoryId
      : categoryRelationByResource.get(row.id) ?? null;
    if (categoryId) categoryIdsToHydrate.add(categoryId);

    for (const tagId of publishedRevision
      ? publishedProjection!.tagIds
      : tagRelationByResource.get(row.id) ?? []) {
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
    const publishedProjection = publishedRevision
      ? publishedArticleProjection(metadata)
      : null;
    const categoryId = publishedRevision
      ? publishedProjection!.categoryId
      : categoryRelationByResource.get(row.id) ?? null;
    const category = categoryId ? categoryById.get(categoryId) ?? null : null;
    const effectiveTagIds = publishedRevision
      ? publishedProjection!.tagIds
      : tagRelationByResource.get(row.id) ?? [];
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
      toc: publishedProjection?.toc ?? row.toc ?? true,
      share: publishedProjection?.share ?? row.share ?? true,
      giscus: publishedProjection?.giscus ?? row.giscus ?? true,
      search: publishedProjection?.search ?? row.searchable ?? true,
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
      minutesRead: publishedRevision
        ? publishedProjection!.minutesRead
        : row.readingMinutes,
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

/**
 * Public catalog/search/sidebar reads must not transport article bodies from
 * D1. Keep this projection explicit so adding a field to the detail query
 * cannot silently make every Blog page fetch the full Markdown corpus again.
 */
export const publicArticleSummarySelection = {
  id: resources.id,
  title: resourceRevisions.title,
  slug: resourceRevisions.slug,
  path: resourceRevisions.path,
  metadataJson: resourceRevisions.metadataJson,
  excerpt: resourceRevisions.description,
  status: resources.status,
  visibility: resourceRevisions.visibility,
  pubDate: resources.publishedAt,
  updatedAt: resources.updatedAt,
} as const;

type PublicArticleSummaryOptions = {
  limit?: number;
  offset?: number;
  slug?: string;
  search?: string;
  categoryIds?: string[];
  publishedVisibility?: PublishedArticleVisibilityScope;
};

async function queryPublicArticleSummaries(
  options: PublicArticleSummaryOptions = {}
) {
  const {
    limit = 20,
    offset = 0,
    slug,
    search,
    categoryIds,
    publishedVisibility = "public",
  } = options;
  const conditions: SQL[] = [
    eq(resources.type, "article"),
    eq(resources.status, "published"),
    publishedArticleVisibilityCondition(publishedVisibility),
  ];
  if (slug) conditions.push(eq(resourceRevisions.slug, slug));
  if (search) conditions.push(like(resourceRevisions.title, `%${search}%`));
  if (categoryIds?.length) {
    conditions.push(categoryCondition(categoryIds, true));
  }

  const rows = await db
    .select(publicArticleSummarySelection)
    .from(resources)
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.publishedRevisionId)
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

  const categoryIdsToHydrate = new Set<string>();
  const tagIdsToHydrate = new Set<string>();
  for (const row of preparedRows) {
    const projection = publishedArticleProjection(row.metadata);
    if (projection.categoryId) categoryIdsToHydrate.add(projection.categoryId);
    for (const tagId of projection.tagIds) {
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
  const categoryById = new Map(categoryRows.map((category) => [category.id, category]));
  const tagById = new Map(tagRows.map((tag) => [tag.id, tag]));

  return preparedRows.map((row) => {
    const metadata = row.metadata;
    const projection = publishedArticleProjection(metadata);
    const categoryId = projection.categoryId;
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      path: row.path,
      subtitle: typeof metadata.subtitle === "string" ? metadata.subtitle : null,
      excerpt: row.excerpt,
      ogImage: typeof metadata.ogImage === "string" ? metadata.ogImage : null,
      draft: false,
      status: row.status,
      visibility: row.visibility,
      toc: projection.toc,
      share: projection.share,
      giscus: projection.giscus,
      search: projection.search,
      radio: metadata.radio === true,
      video: metadata.video === true,
      platform: typeof metadata.platform === "string" ? metadata.platform : null,
      minutesRead: projection.minutesRead,
      pubDate: row.pubDate,
      lastModDate: row.updatedAt,
      categoryId,
      updatedAt: row.updatedAt,
      category: categoryId ? categoryById.get(categoryId) ?? null : null,
      postTags: projection.tagIds.flatMap((tagId) => {
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

export async function getPublicPostSummaryBySlug(
  slug: string,
  options: { allowUnlisted?: boolean } = {}
) {
  const rows = await queryPublicArticleSummaries({
    slug,
    limit: 1,
    publishedVisibility: options.allowUnlisted
      ? "public-or-unlisted"
      : "public",
  });
  return rows[0] ?? null;
}

export async function getPublicPostTagProjections(options: {
  limit?: number;
  offset?: number;
} = {}) {
  const rows = await db
    .select({
      id: resources.id,
      metadataJson: resourceRevisions.metadataJson,
    })
    .from(resources)
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.publishedRevisionId)
    )
    .where(and(
      eq(resources.type, "article"),
      eq(resources.status, "published"),
      publishedArticleVisibilityCondition("public")
    ))
    .orderBy(desc(resources.publishedAt), desc(resources.id))
    .limit(Math.min(Math.max(options.limit ?? 1_000, 1), 1_000))
    .offset(Math.max(options.offset ?? 0, 0));
  if (rows.length === 0) return [];

  const metadataByResource = new Map(
    rows.map((row) => [row.id, parseMetadata(row.metadataJson)])
  );
  const resourceIds = rows.map((row) => row.id);

  const effectiveIds = new Map<string, string[]>();
  const tagIds = new Set<string>();
  for (const resourceId of resourceIds) {
    const ids = publishedArticleProjection(
      metadataByResource.get(resourceId) ?? {},
    ).tagIds;
    effectiveIds.set(resourceId, ids);
    ids.forEach((id) => tagIds.add(id));
  }
  const tagRows: Array<Pick<typeof tags.$inferSelect, "id" | "name">> = [];
  const tagIdList = [...tagIds];
  for (let index = 0; index < tagIdList.length; index += 80) {
    tagRows.push(...await db
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .where(inArray(tags.id, tagIdList.slice(index, index + 80))));
  }
  const tagNameById = new Map(tagRows.map((tag) => [tag.id, tag.name]));
  return resourceIds.map((id) => ({
    id,
    tagNames: (effectiveIds.get(id) ?? []).flatMap((tagId) => {
      const name = tagNameById.get(tagId);
      return name ? [name] : [];
    }),
  }));
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

export async function getPublicPosts(options?: {
  limit?: number;
  offset?: number;
  categoryId?: string;
  search?: string;
}) {
  const rows = await queryPublicArticleSummaries({
    limit: options?.limit,
    offset: options?.offset,
    search: options?.search,
    categoryIds: options?.categoryId ? [options.categoryId] : undefined,
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

export async function getPublicPostBySlug(
  slug: string,
  options: { allowUnlisted?: boolean } = {}
) {
  const rows = await queryArticles({
    slug,
    limit: 1,
    draft: false,
    publishedRevision: true,
    publishedVisibility: options.allowUnlisted
      ? "public-or-unlisted"
      : "public",
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

export async function getPublicPostsCount(options?: {
  categoryId?: string;
}) {
  const conditions: SQL[] = [
    eq(resources.type, "article"),
    eq(resources.status, "published"),
    publishedArticleVisibilityCondition("public"),
  ];
  if (options?.categoryId) {
    conditions.push(categoryCondition([options.categoryId], true));
  }

  const [result] = await db
    .select({ total: countDistinct(resources.id) })
    .from(resources)
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.publishedRevisionId)
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

export async function getPublicPostsWithContent(options?: {
  limit?: number;
  offset?: number;
  categoryId?: string;
}) {
  return queryArticles({
    ...options,
    categoryIds: options?.categoryId ? [options.categoryId] : undefined,
    draft: false,
    publishedRevision: true,
    publishedVisibility: "public",
  });
}

export async function getPublicPostSummariesWithCategoryPath(options: {
  limit?: number;
  offset?: number;
  categoryId?: string;
  categoryPath?: string;
} = {}) {
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

  let categoryId = options.categoryId;
  if (options.categoryPath) {
    categoryId = allCategories.find(
      (category) => buildPath(category.id).slugPath === options.categoryPath
    )?.id;
    if (!categoryId) return [];
  }
  const categoryIds = categoryId
    ? await getCategoryWithDescendantIds(categoryId)
    : undefined;
  const rows = await queryPublicArticleSummaries({
    ...options,
    categoryIds,
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

type PostsWithCategoryPathOptions = {
  limit?: number;
  offset?: number;
  categoryId?: string;
  categoryPath?: string;
  draft?: boolean;
  publishedVisibility?: PublishedArticleVisibilityScope;
};

async function queryPostsWithCategoryPath(
  options: PostsWithCategoryPathOptions = {}
) {
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

  let categoryId = options.categoryId;
  if (options.categoryPath) {
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
    publishedRevision: options.draft === false,
    publishedVisibility: options.publishedVisibility,
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

export async function getPostsWithCategoryPath(options?: {
  limit?: number;
  offset?: number;
  categoryId?: string;
  categoryPath?: string;
  draft?: boolean;
}) {
  return queryPostsWithCategoryPath(options);
}

export async function getPublicPostsWithCategoryPath(options?: {
  limit?: number;
  offset?: number;
  categoryId?: string;
  categoryPath?: string;
}) {
  return queryPostsWithCategoryPath({
    ...options,
    draft: false,
    publishedVisibility: "public",
  });
}
