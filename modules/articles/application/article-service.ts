import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  articles,
  categories,
  resourceCategories,
  resourceTags,
  resources,
  tags,
} from "@/lib/db/schema";
import {
  archiveResourceIds,
  createResource,
  publishResource,
  saveResourceRevision,
  scheduleResource,
} from "@/modules/resources/application/commands";
import { getStudioResource } from "@/modules/resources/application/queries";
import { articleResourceIdCandidates } from "@/modules/articles/domain/id";
import { resourceSlug } from "@/modules/resources/domain/slug";
import {
  articleProjectionFromMetadata,
  articleProjectionGuard,
  articleProjectionWriteStatements,
  articlePublishedPointerGuard,
  articleRevisionMetadataGuard,
  freezeLegacyPublishedArticleStatement,
  parseArticleMetadata,
  readArticleProjection,
  readArticlePublicationSnapshot,
  type ArticleProjection,
} from "@/modules/articles/infrastructure/article-projection";

const articleInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  slug: z.string().trim().min(1).max(500).optional(),
  subtitle: z.string().max(1_000).nullable().optional(),
  content: z.string(),
  excerpt: z.string().max(4_000).nullable().optional(),
  ogImage: z.string().max(2_000).nullable().optional(),
  draft: z.boolean().default(true),
  visibility: z.enum(["public", "unlisted", "private"]).default("public"),
  toc: z.boolean().default(true),
  share: z.boolean().default(true),
  giscus: z.boolean().default(true),
  search: z.boolean().default(true),
  radio: z.boolean().default(false),
  video: z.boolean().default(false),
  platform: z.string().max(100).nullable().optional(),
  minutesRead: z.number().nonnegative().nullable().optional(),
  pubDate: z.coerce.date().optional(),
  categoryId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).default([]),
  authorId: z.string().nullable().optional(),
  changeSummary: z.string().max(500).nullable().optional(),
});

export type ArticleMutationInput = z.input<typeof articleInputSchema>;

export const articleSlug = resourceSlug;

function readMetadata(metadataJson: string) {
  try {
    const value: unknown = JSON.parse(metadataJson);
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

async function validateTaxonomy(categoryId: string | null, tagIds: string[]) {
  if (categoryId) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);
    if (!category) throw new Error(`Category ${categoryId} was not found.`);
  }

  const uniqueTagIds = [...new Set(tagIds)];
  if (uniqueTagIds.length > 0) {
    const found = await db
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.id, uniqueTagIds));
    if (found.length !== uniqueTagIds.length) {
      throw new Error("One or more tags were not found.");
    }
  }
  return uniqueTagIds;
}

async function setArticleFields(input: {
  resourceId: string;
  categoryId: string | null;
  tagIds: string[];
  toc: boolean;
  share: boolean;
  giscus: boolean;
  searchable: boolean;
  readingMinutes: number | null;
}) {
  const articleQuery = db
    .insert(articles)
    .values({
      resourceId: input.resourceId,
      toc: input.toc,
      share: input.share,
      giscus: input.giscus,
      searchable: input.searchable,
      readingMinutes: input.readingMinutes,
    })
    .onConflictDoUpdate({
      target: articles.resourceId,
      set: {
        toc: input.toc,
        share: input.share,
        giscus: input.giscus,
        searchable: input.searchable,
        readingMinutes: input.readingMinutes,
      },
    });
  const deleteCategories = db
    .delete(resourceCategories)
    .where(eq(resourceCategories.resourceId, input.resourceId));
  const deleteTags = db
    .delete(resourceTags)
    .where(eq(resourceTags.resourceId, input.resourceId));
  const categoryQuery = input.categoryId
    ? db.insert(resourceCategories).values({
        resourceId: input.resourceId,
        categoryId: input.categoryId,
      })
    : null;
  const tagsQuery = input.tagIds.length > 0
    ? db.insert(resourceTags).values(
        input.tagIds.map((tagId) => ({ resourceId: input.resourceId, tagId }))
      )
    : null;

  if (categoryQuery && tagsQuery) {
    await db.batch([articleQuery, deleteCategories, deleteTags, categoryQuery, tagsQuery]);
  } else if (categoryQuery) {
    await db.batch([articleQuery, deleteCategories, deleteTags, categoryQuery]);
  } else if (tagsQuery) {
    await db.batch([articleQuery, deleteCategories, deleteTags, tagsQuery]);
  } else {
    await db.batch([articleQuery, deleteCategories, deleteTags]);
  }
}

function articleMetadata(
  current: Record<string, unknown>,
  input: z.output<typeof articleInputSchema>
) {
  return {
    ...current,
    subtitle: input.subtitle ?? null,
    ogImage: input.ogImage ?? null,
    radio: input.radio,
    video: input.video,
    platform: input.platform ?? null,
    categoryId: input.categoryId ?? null,
    tagIds: input.tagIds,
    toc: input.toc,
    share: input.share,
    giscus: input.giscus,
    search: input.search,
    minutesRead: input.minutesRead ?? null,
  };
}

function projectionFromInput(
  input: z.output<typeof articleInputSchema>,
  tagIds: string[],
): ArticleProjection {
  return {
    categoryId: input.categoryId ?? null,
    tagIds,
    toc: input.toc,
    share: input.share,
    giscus: input.giscus,
    search: input.search,
    minutesRead: input.minutesRead ?? null,
  };
}

export async function resolveArticleResourceId(id: string) {
  const candidates = articleResourceIdCandidates(id);
  const [direct] = await db
    .select({ id: resources.id })
    .from(resources)
    .where(and(inArray(resources.id, candidates), eq(resources.type, "article")))
    .limit(1);
  if (direct) return direct.id;
  return null;
}

export async function createArticle(input: ArticleMutationInput) {
  const parsed = articleInputSchema.parse(input);
  const slug = articleSlug(parsed.slug || parsed.title);
  if (!slug) throw new Error("Article slug is empty after normalization.");
  const tagIds = await validateTaxonomy(parsed.categoryId ?? null, parsed.tagIds);

  const created = await createResource({
    type: "article",
    title: parsed.title,
    slug,
    path: `/blog/${slug}`,
    description: parsed.excerpt ?? parsed.subtitle ?? null,
    visibility: parsed.visibility,
    content: parsed.content,
    contentFormat: "markdown",
    metadata: articleMetadata({}, parsed),
    authorId: parsed.authorId,
    changeSummary: parsed.changeSummary ?? "Created in Studio",
  });

  try {
    await setArticleFields({
      resourceId: created.id,
      categoryId: parsed.categoryId ?? null,
      tagIds,
      toc: parsed.toc,
      share: parsed.share,
      giscus: parsed.giscus,
      searchable: parsed.search,
      readingMinutes: parsed.minutesRead ?? null,
    });
  } catch (error) {
    await archiveResourceIds([created.id], parsed.authorId);
    throw error;
  }

  if (!parsed.draft) {
    if (parsed.pubDate && parsed.pubDate > new Date()) {
      await scheduleResource(created.id, parsed.pubDate, parsed.authorId, {
        expectedCurrentRevisionId: created.revisionId,
      });
    } else {
      await publishResource(created.id, parsed.authorId, parsed.pubDate, {
        expectedCurrentRevisionId: created.revisionId,
      });
    }
  }
  return created;
}

export async function updateArticle(id: string, input: ArticleMutationInput) {
  const resourceId = await resolveArticleResourceId(id);
  if (!resourceId) throw new Error(`Article ${id} was not found.`);
  const current = await getStudioResource(resourceId);
  if (!current || current.type !== "article") {
    throw new Error(`Article ${id} was not found.`);
  }

  const parsed = articleInputSchema.parse(input);
  const slug = articleSlug(parsed.slug || parsed.title);
  if (!slug) throw new Error("Article slug is empty after normalization.");
  const tagIds = await validateTaxonomy(parsed.categoryId ?? null, parsed.tagIds);
  const nextProjection = projectionFromInput(parsed, tagIds);
  const [currentProjection, publicationSnapshot] = await Promise.all([
    readArticleProjection(resourceId),
    readArticlePublicationSnapshot(resourceId),
  ]);
  if (!publicationSnapshot || publicationSnapshot.type !== "article") {
    throw new Error(`Article ${id} was not found.`);
  }

  const guardStatements = [
    articlePublishedPointerGuard(resourceId, publicationSnapshot.publishedRevisionId),
    articleProjectionGuard(resourceId, currentProjection),
  ];
  const additionalStatements = [];
  if (publicationSnapshot.publishedRevisionId) {
    const publishedMetadataJson = publicationSnapshot.publishedMetadataJson;
    if (publishedMetadataJson === null) {
      throw new Error("The published article revision is missing.");
    }
    const publishedMetadata = parseArticleMetadata(publishedMetadataJson);
    const publishedProjection = articleProjectionFromMetadata(publishedMetadata);
    if (!publishedProjection
      && publicationSnapshot.currentRevisionId !== publicationSnapshot.publishedRevisionId) {
      throw new Error(
        "The legacy published article projection must be repaired before saving another draft.",
      );
    }
    guardStatements.push(articleRevisionMetadataGuard(
      publicationSnapshot.publishedRevisionId,
      publishedMetadataJson,
    ));
    const freezeStatement = freezeLegacyPublishedArticleStatement({
      revisionId: publicationSnapshot.publishedRevisionId,
      metadataJson: publishedMetadataJson,
      projection: currentProjection,
    });
    if (freezeStatement) additionalStatements.push(freezeStatement);
  }
  additionalStatements.push(...articleProjectionWriteStatements(resourceId, nextProjection));

  const revision = await saveResourceRevision(resourceId, {
    expectedCurrentRevisionId: current.revisionId,
    title: parsed.title,
    slug,
    path: `/blog/${slug}`,
    description: parsed.excerpt ?? parsed.subtitle ?? null,
    visibility: parsed.visibility,
    content: parsed.content,
    contentFormat: "markdown",
    metadata: articleMetadata(readMetadata(current.metadataJson), parsed),
    changeSummary: parsed.changeSummary ?? "Updated in Studio",
    actorId: parsed.authorId,
  }, {
    guardStatements,
    additionalStatements,
  });

  if (!parsed.draft) {
    if (parsed.pubDate && parsed.pubDate > new Date()) {
      await scheduleResource(resourceId, parsed.pubDate, parsed.authorId, {
        expectedCurrentRevisionId: revision.revisionId,
      });
    } else {
      await publishResource(resourceId, parsed.authorId, parsed.pubDate, {
        expectedCurrentRevisionId: revision.revisionId,
      });
    }
  }
  return revision;
}

export async function archiveArticles(ids: string[], actorId?: string | null) {
  const resolved = await Promise.all(ids.map(resolveArticleResourceId));
  return archiveResourceIds(resolved.filter((id): id is string => Boolean(id)), actorId);
}
