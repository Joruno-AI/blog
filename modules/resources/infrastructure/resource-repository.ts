import { and, count, desc, eq, getTableColumns, inArray, like, max, ne, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import { db } from "@/lib/db";
import { resourceSearchTable } from "@/lib/db/resource-search-table";
import {
  publicationEvents,
  redirects,
  resourceRevisions,
  resourceRoutes,
  resources,
} from "@/lib/db/schema";
import type {
  ContentFormat,
  ResourceStatus,
  ResourceType,
  ResourceVisibility,
} from "@/modules/resources/domain/types";

export type PublishedResource = {
  id: string;
  type: ResourceType;
  title: string;
  slug: string;
  path: string;
  description: string | null;
  visibility: ResourceVisibility;
  coverAssetId: string | null;
  publishedAt: Date | null;
  revisionId: string;
  version: number;
  content: string;
  contentFormat: ContentFormat;
  metadataJson: string;
};

export type PublishedResourceSummary = Omit<PublishedResource, "content">;

export type PublicResourceSearchResult = {
  id: string;
  type: ResourceType;
  title: string;
  slug: string;
  path: string;
  description: string | null;
  publishedAt: Date | null;
};

export type ResourceLifecycleSnapshot = Pick<
  typeof resources.$inferSelect,
  "id" | "currentRevisionId" | "publishedRevisionId" | "status" | "scheduledAt"
>;

export type PublishCurrentRevisionTransaction = {
  /** Refuse to publish anything except this exact current revision. */
  expectedCurrentRevisionId?: string;
  /**
   * Full lifecycle CAS used by the scheduler. This freezes the revision,
   * publication pointer, status and scheduled instant selected by the due scan.
   */
  expectedLifecycle?: ResourceLifecycleSnapshot;
  /** Domain-owned snapshot guards evaluated in the publication transaction. */
  guardStatements?: readonly BatchItem<"sqlite">[];
  /** Domain-owned side projections committed before publication becomes visible. */
  additionalStatements?: readonly BatchItem<"sqlite">[];
};

export class ResourcePublicationConflictError extends Error {
  override readonly name = "ResourcePublicationConflictError";
}

export const publicSearchCollections = ["blog", "changelog"] as const;
export type PublicSearchCollection = (typeof publicSearchCollections)[number];

export const publishedResourceSummarySelection = {
  id: resources.id,
  type: resources.type,
  title: resources.title,
  slug: resources.slug,
  path: resources.path,
  description: resources.description,
  visibility: resources.visibility,
  coverAssetId: resources.coverAssetId,
  publishedAt: resources.publishedAt,
  revisionId: resourceRevisions.id,
  version: resourceRevisions.version,
  contentFormat: resourceRevisions.contentFormat,
  metadataJson: resourceRevisions.metadataJson,
};

const publishedSelection = {
  ...publishedResourceSummarySelection,
  content: resourceRevisions.content,
};

export async function findPublishedResourceSummaryByPath(path: string) {
  const [result] = await db
    .select({
      ...publishedResourceSummarySelection,
      revisionVisibility: resourceRevisions.visibility,
    })
    .from(resourceRoutes)
    .innerJoin(resources, eq(resources.id, resourceRoutes.resourceId))
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.publishedRevisionId)
    )
    .where(
      and(
        eq(resourceRoutes.path, path),
        eq(resources.status, "published")
      )
    )
    .limit(1);

  return result ?? null;
}

export async function findPublishedResourceByPath(path: string) {
  const [result] = await db
    .select({
      ...publishedSelection,
      revisionVisibility: resourceRevisions.visibility,
    })
    .from(resourceRoutes)
    .innerJoin(resources, eq(resources.id, resourceRoutes.resourceId))
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.publishedRevisionId)
    )
    .where(
      and(
        eq(resourceRoutes.path, path),
        eq(resources.status, "published")
      )
    )
    .limit(1);

  return result ?? null;
}

export async function findPublicChangelogResourceBySlug(slug: string) {
  const [result] = await db
    .select(publishedSelection)
    .from(resources)
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.publishedRevisionId)
    )
    .where(and(
      eq(resources.type, "document"),
      eq(resourceRevisions.slug, slug),
      like(resourceRevisions.path, "/changelog/%"),
      eq(resources.status, "published"),
      eq(resources.visibility, "public"),
      eq(resourceRevisions.visibility, "public")
    ))
    .limit(1);

  return result ?? null;
}

export async function findEditableResourceById(id: string) {
  const [result] = await db
    .select({
      id: resources.id,
      type: resources.type,
      title: resourceRevisions.title,
      slug: resourceRevisions.slug,
      path: resourceRevisions.path,
      description: resourceRevisions.description,
      visibility: resourceRevisions.visibility,
      coverAssetId: resources.coverAssetId,
      revisionId: resourceRevisions.id,
      version: resourceRevisions.version,
      content: resourceRevisions.content,
      contentFormat: resourceRevisions.contentFormat,
      metadataJson: resourceRevisions.metadataJson,
      status: resources.status,
      publishedRevisionId: resources.publishedRevisionId,
      publishedAt: resources.publishedAt,
      scheduledAt: resources.scheduledAt,
    })
    .from(resources)
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.currentRevisionId)
    )
    .where(eq(resources.id, id))
    .limit(1);

  return result ?? null;
}

export async function listEditableResources(options: {
  types?: ResourceType[];
  status?: ResourceStatus;
  search?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { types, status, search, limit = 50, offset = 0 } = options;
  const conditions = [ne(resources.status, "archived")];
  if (types?.length) conditions.push(inArray(resources.type, types));
  if (status) conditions.push(eq(resources.status, status));
  if (search) conditions.push(sql`${resourceRevisions.title} LIKE ${`%${search}%`}`);

  return db
    .select({
      id: resources.id,
      type: resources.type,
      title: resourceRevisions.title,
      slug: resourceRevisions.slug,
      path: resourceRevisions.path,
      description: resourceRevisions.description,
      visibility: resourceRevisions.visibility,
      status: resources.status,
      revisionId: resourceRevisions.id,
      version: resourceRevisions.version,
      content: resourceRevisions.content,
      contentFormat: resourceRevisions.contentFormat,
      metadataJson: resourceRevisions.metadataJson,
      publishedAt: resources.publishedAt,
      updatedAt: resources.updatedAt,
    })
    .from(resources)
    .innerJoin(resourceRevisions, eq(resourceRevisions.id, resources.currentRevisionId))
    .where(and(...conditions))
    .orderBy(desc(resources.updatedAt), desc(resources.id))
    .limit(Math.min(Math.max(limit, 1), 100))
    .offset(Math.max(offset, 0));
}

export async function countEditableResources(options: {
  types?: ResourceType[];
  status?: ResourceStatus;
  search?: string;
} = {}) {
  const { types, status, search } = options;
  const conditions = [ne(resources.status, "archived")];
  if (types?.length) conditions.push(inArray(resources.type, types));
  if (status) conditions.push(eq(resources.status, status));
  if (search) conditions.push(sql`${resourceRevisions.title} LIKE ${`%${search}%`}`);
  const [result] = await db
    .select({ total: count() })
    .from(resources)
    .innerJoin(resourceRevisions, eq(resourceRevisions.id, resources.currentRevisionId))
    .where(and(...conditions));
  return result?.total ?? 0;
}

export async function listPublishedResources(options: {
  type?: ResourceType;
  limit?: number;
  offset?: number;
} = {}) {
  const { type, limit = 20, offset = 0 } = options;
  const conditions = [
    eq(resources.status, "published"),
    eq(resources.visibility, "public"),
    eq(resourceRevisions.visibility, "public"),
  ];
  if (type) conditions.push(eq(resources.type, type));

  return db
    .select(publishedSelection)
    .from(resources)
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.publishedRevisionId)
    )
    .where(and(...conditions))
    .orderBy(desc(resources.publishedAt))
    .limit(Math.min(Math.max(limit, 1), 100))
    .offset(Math.max(offset, 0));
}

export async function listPublishedResourceSummaries(options: {
  type?: ResourceType;
  limit?: number;
  offset?: number;
} = {}) {
  const { type, limit = 20, offset = 0 } = options;
  const conditions = [
    eq(resources.status, "published"),
    eq(resources.visibility, "public"),
    eq(resourceRevisions.visibility, "public"),
  ];
  if (type) conditions.push(eq(resources.type, type));

  return db
    .select(publishedResourceSummarySelection)
    .from(resources)
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.publishedRevisionId)
    )
    .where(and(...conditions))
    .orderBy(desc(resources.publishedAt))
    .limit(Math.min(Math.max(limit, 1), 100))
    .offset(Math.max(offset, 0));
}

export async function listPublishedResourcesByTypes(options: {
  types: ResourceType[];
  limit?: number;
  offset?: number;
}) {
  const { types, limit = 20, offset = 0 } = options;
  if (types.length === 0) return [];

  return db
    .select(publishedSelection)
    .from(resources)
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.publishedRevisionId)
    )
    .where(
      and(
        eq(resources.status, "published"),
        eq(resources.visibility, "public"),
        eq(resourceRevisions.visibility, "public"),
        inArray(resources.type, types)
      )
    )
    .orderBy(desc(resources.publishedAt), desc(resources.id))
    .limit(Math.min(Math.max(limit, 1), 100))
    .offset(Math.max(offset, 0));
}

export async function listPublishedResourcesByPathPrefix(prefix: string, limit = 100) {
  return db
    .select(publishedSelection)
    .from(resources)
    .innerJoin(resourceRevisions, eq(resourceRevisions.id, resources.publishedRevisionId))
    .where(and(
      eq(resources.status, "published"),
      eq(resources.visibility, "public"),
      eq(resourceRevisions.visibility, "public"),
      like(resources.path, `${prefix}/%`)
    ))
    .orderBy(desc(resources.publishedAt), desc(resources.id))
    .limit(Math.min(Math.max(limit, 1), 1000));
}

export async function listPublishedResourceSummariesByPathPrefix(prefix: string, limit = 100) {
  return db
    .select(publishedResourceSummarySelection)
    .from(resources)
    .innerJoin(resourceRevisions, eq(resourceRevisions.id, resources.publishedRevisionId))
    .where(and(
      eq(resources.status, "published"),
      eq(resources.visibility, "public"),
      eq(resourceRevisions.visibility, "public"),
      like(resources.path, `${prefix}/%`)
    ))
    .orderBy(desc(resources.publishedAt), desc(resources.id))
    .limit(Math.min(Math.max(limit, 1), 1000));
}

export async function listPublicResourceRoutes() {
  return db
    .select({
      path: resources.path,
      type: resources.type,
      updatedAt: resources.updatedAt,
    })
    .from(resources)
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.publishedRevisionId)
    )
    .where(
      and(
        eq(resources.status, "published"),
        eq(resources.visibility, "public"),
        eq(resourceRevisions.visibility, "public")
      )
    )
    .orderBy(desc(resources.updatedAt));
}

export async function countPublishedResources(type?: ResourceType) {
  const conditions = [
    eq(resources.status, "published"),
    eq(resources.visibility, "public"),
    eq(resourceRevisions.visibility, "public"),
  ];
  if (type) conditions.push(eq(resources.type, type));

  const [result] = await db
    .select({ total: count() })
    .from(resources)
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.publishedRevisionId)
    )
    .where(and(...conditions));
  return result?.total ?? 0;
}

export function buildPublishedResourceSearchQuery(
  query: string,
  collection: PublicSearchCollection,
  limit = 30
) {
  const tokens = query
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}_-]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);

  if (tokens.length === 0) return null;
  const match = tokens.map((token) => `"${token.replaceAll('"', '""')}"*`).join(" AND ");
  const collectionCondition = collection === "blog"
    ? sql`r.type = 'article' AND r.path LIKE '/blog/%'`
    : sql`r.type = 'document' AND r.path LIKE '/changelog/%'`;

  return sql`
    SELECT
      r.id,
      r.type,
      r.title,
      r.slug,
      r.path,
      CASE
        WHEN trim(coalesce(r.description, '')) <> '' THEN substr(r.description, 1, 512)
        ELSE snippet(resource_search, 3, '', '', ' … ', 32)
      END AS summary,
      r.published_at AS publishedAt
    FROM resource_search
    CROSS JOIN resources r ON r.id = resource_search.resource_id
    JOIN resource_revisions rr ON rr.id = r.published_revision_id
    WHERE resource_search MATCH ${match}
      AND r.status = 'published'
      AND r.visibility = 'public'
      AND rr.visibility = 'public'
      AND ${collectionCondition}
    ORDER BY bm25(resource_search), r.published_at DESC
    LIMIT ${Math.min(Math.max(limit, 1), 100)}
  `;
}

export function sanitizePublicSearchSummary(value: string | null, maxLength = 240) {
  if (!value || maxLength < 1) return "";
  const plain = value
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>#~|]+/g, " ")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const characters = Array.from(plain);
  return characters.length <= maxLength
    ? plain
    : `${characters.slice(0, maxLength - 1).join("").trimEnd()}…`;
}

export function dateFromD1UnixSeconds(value: number | null) {
  return value === null ? null : new Date(value * 1_000);
}

export async function searchPublishedResources(
  query: string,
  collection: PublicSearchCollection,
  limit = 30
) {
  const statement = buildPublishedResourceSearchQuery(query, collection, limit);
  if (!statement) return [];

  const rows = await db.all<{
    id: string;
    type: ResourceType;
    title: string;
    slug: string;
    path: string;
    summary: string | null;
    publishedAt: number | null;
  }>(statement);

  return rows.map(({ summary, ...row }) => ({
    ...row,
    description: sanitizePublicSearchSummary(summary),
    publishedAt: dateFromD1UnixSeconds(row.publishedAt),
  })) satisfies PublicResourceSearchResult[];
}

export async function findRedirectByPath(path: string) {
  const [result] = await db
    .select({ toPath: redirects.toPath, statusCode: redirects.statusCode })
    .from(redirects)
    .where(eq(redirects.fromPath, path))
    .limit(1);
  return result ?? null;
}

export async function findResourceIdentity(id: string, database: typeof db = db) {
  const [resource] = await database
    .select()
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);
  return resource ?? null;
}

export async function nextResourceVersion(resourceId: string) {
  const [result] = await db
    .select({ version: max(resourceRevisions.version) })
    .from(resourceRevisions)
    .where(eq(resourceRevisions.resourceId, resourceId));
  return (result?.version ?? 0) + 1;
}

export async function insertResourceBundle(input: {
  resource: typeof resources.$inferInsert;
  revision: typeof resourceRevisions.$inferInsert;
  route: typeof resourceRoutes.$inferInsert;
  event: typeof publicationEvents.$inferInsert;
}) {
  await db.batch([
    db.insert(resources).values(input.resource),
    db.insert(resourceRevisions).values(input.revision),
    db.insert(resourceRoutes).values(input.route),
    db.insert(publicationEvents).values(input.event),
  ] as const);
}

export async function insertRevisionAndSelectIt(input: {
  resourceId: string;
  expectedCurrentRevisionId: string;
  revision: typeof resourceRevisions.$inferInsert;
  actorId?: string | null;
  /** Domain-owned guards that must still hold when the revision is committed. */
  guardStatements?: readonly BatchItem<"sqlite">[];
  /** Domain-owned side projections committed with the new revision pointer. */
  additionalStatements?: readonly BatchItem<"sqlite">[];
}, database: typeof db = db) {
  const now = new Date();
  const resourceUpdate = {
    currentRevisionId: input.revision.id,
    // A schedule always targets the revision pointer that existed when it was
    // created. Repointing current_revision_id must invalidate that schedule in
    // the same transaction; otherwise the cron can observe the new draft with
    // the old due timestamp and publish content the editor never scheduled.
    status: sql<ResourceStatus>`CASE
      WHEN ${resources.scheduledAt} IS NOT NULL
        THEN CASE
          WHEN ${resources.publishedRevisionId} IS NULL THEN 'draft'
          ELSE 'published'
        END
      ELSE ${resources.status}
    END`,
    scheduledAt: null,
    updatedAt: now,
  };

  const queries: BatchItem<"sqlite">[] = [
    database.select({
      guard: sql`json_extract(
        CASE WHEN EXISTS (
          SELECT 1
          FROM resources AS live_resource
          WHERE live_resource.id = ${input.resourceId}
            AND live_resource.current_revision_id IS ${input.expectedCurrentRevisionId}
        )
          THEN '{}'
          ELSE 'RESOURCE_REVISION_CONFLICT'
        END,
        '$'
      )`,
    }).from(sql`(SELECT 1)`),
    ...(input.guardStatements ?? []),
    database.insert(resourceRevisions).values(input.revision),
    database
      .update(resources)
      .set(resourceUpdate)
      .where(and(
        eq(resources.id, input.resourceId),
        eq(resources.currentRevisionId, input.expectedCurrentRevisionId),
      )),
    ...(input.additionalStatements ?? []),
    database.insert(publicationEvents).values({
      id: crypto.randomUUID(),
      resourceId: input.resourceId,
      revisionId: input.revision.id,
      eventType: "draft_saved",
      actorId: input.actorId,
      createdAt: now,
    }),
  ];

  try {
    await database.batch(
      queries as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]],
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("malformed JSON")) {
      throw new Error(
        `Resource ${input.resourceId} changed while its revision was being saved.`,
        { cause: error },
      );
    }
    throw error;
  }
}

export async function publishCurrentRevision(input: {
  resourceId: string;
  actorId?: string | null;
  publishedAt?: Date;
} & PublishCurrentRevisionTransaction, database: typeof db = db) {
  // Read the resource pointer and the exact revision it points to in one query.
  // Keeping this as a single immutable snapshot prevents mixing resource state
  // from one revision with title/path fields from another revision.
  const [snapshot] = await database
    .select({
      ...getTableColumns(resources),
      draftRevisionId: resourceRevisions.id,
      draftTitle: resourceRevisions.title,
      draftSlug: resourceRevisions.slug,
      draftPath: resourceRevisions.path,
      draftDescription: resourceRevisions.description,
      draftVisibility: resourceRevisions.visibility,
    })
    .from(resources)
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.currentRevisionId),
    )
    .where(eq(resources.id, input.resourceId))
    .limit(1);
  if (!snapshot?.currentRevisionId) return null;

  const {
    draftRevisionId,
    draftTitle,
    draftSlug,
    draftPath,
    draftDescription,
    draftVisibility,
    ...resource
  } = snapshot;
  const draft = {
    revisionId: draftRevisionId,
    title: draftTitle,
    slug: draftSlug,
    path: draftPath,
    description: draftDescription,
    visibility: draftVisibility,
  };

  const expectedCurrentRevisionId = input.expectedCurrentRevisionId
    ?? input.expectedLifecycle?.currentRevisionId;
  if (
    (expectedCurrentRevisionId !== undefined
      && draft.revisionId !== expectedCurrentRevisionId)
    || (input.expectedLifecycle !== undefined
      && !sameResourceLifecycle(resource, input.expectedLifecycle))
  ) {
    throw new ResourcePublicationConflictError(
      "Resource changed while publication was being prepared.",
    );
  }
  if (resource.status === "archived") {
    throw new Error(`Resource ${input.resourceId} is archived.`);
  }

  const [routeOwner] = await database
    .select({ resourceId: resourceRoutes.resourceId })
    .from(resourceRoutes)
    .where(eq(resourceRoutes.path, draft.path))
    .limit(1);
  if (routeOwner && routeOwner.resourceId !== input.resourceId) {
    throw new Error(`Resource path ${draft.path} is already in use.`);
  }

  const publishedAt = input.publishedAt ?? new Date();
  const frozenScheduledAt = resource.scheduledAt
    ? Math.floor(resource.scheduledAt.getTime() / 1_000)
    : null;
  const publicationSnapshotIsCurrent = sql`EXISTS (
    SELECT 1
    FROM resources AS live_resource
    WHERE live_resource.id = ${input.resourceId}
      AND live_resource.current_revision_id IS ${resource.currentRevisionId}
      AND live_resource.published_revision_id IS ${resource.publishedRevisionId}
      AND live_resource.status = ${resource.status}
      AND live_resource.scheduled_at IS ${frozenScheduledAt}
  )`;
  const guard = database.select({
    guard: sql`json_extract(
      CASE WHEN ${publicationSnapshotIsCurrent}
        THEN '{}'
        ELSE 'RESOURCE_PUBLICATION_CONFLICT'
      END,
      '$'
    )`,
  }).from(sql`(SELECT 1)`);
  const update = database
    .update(resources)
    .set({
      title: draft.title,
      slug: draft.slug,
      path: draft.path,
      description: draft.description,
      visibility: draft.visibility,
      status: "published",
      publishedRevisionId: draft.revisionId,
      publishedAt,
      scheduledAt: null,
      updatedAt: publishedAt,
    })
    .where(and(
      eq(resources.id, input.resourceId),
      eq(resources.currentRevisionId, draft.revisionId),
      sql`${resources.publishedRevisionId} IS ${resource.publishedRevisionId}`,
      eq(resources.status, resource.status),
      sql`${resources.scheduledAt} IS ${frozenScheduledAt}`,
    ));
  const event = database.insert(publicationEvents).values({
    id: crypto.randomUUID(),
    resourceId: input.resourceId,
    revisionId: draft.revisionId,
    eventType: "published",
    actorId: input.actorId,
    createdAt: publishedAt,
  });

  const searchDelete = database
    .delete(resourceSearchTable)
    .where(eq(resourceSearchTable.resourceId, input.resourceId));
  const searchInsert = database.insert(resourceSearchTable).select(
    database
      .select({
        resourceId: resources.id,
        title: resourceRevisions.title,
        description: sql<string>`coalesce(${resourceRevisions.description}, '')`.as("description"),
        content: resourceRevisions.content,
        tokens: sql<string>`lower(${resourceRevisions.title} || ' ' || coalesce(${resourceRevisions.description}, ''))`.as("tokens"),
      })
      .from(resources)
      .innerJoin(
        resourceRevisions,
        eq(resourceRevisions.id, resources.publishedRevisionId),
      )
      .where(and(
        eq(resources.id, input.resourceId),
        eq(resources.status, "published"),
        sql`(
          ${resources.type} <> 'article'
          OR coalesce(json_extract(${resourceRevisions.metadataJson}, '$.search'), 1) = 1
        )`,
      )),
  );

  try {
    const statements: BatchItem<"sqlite">[] = [
      guard,
      ...(input.guardStatements ?? []),
    ];
    if (draft.path !== resource.path) {
      statements.push(
        database.delete(resourceRoutes).where(and(
          eq(resourceRoutes.path, resource.path),
          eq(resourceRoutes.resourceId, input.resourceId),
        )),
        // A stale alias already owned by this resource may be replaced, but a
        // route owned by another resource must make the following INSERT fail.
        // Never upsert ownership: the unique constraint is the final TOCTOU
        // guard when two publishers race for the same path.
        database.delete(resourceRoutes).where(and(
          eq(resourceRoutes.path, draft.path),
          eq(resourceRoutes.resourceId, input.resourceId),
        )),
        database
          .insert(resourceRoutes)
          .values({
            path: draft.path,
            resourceId: input.resourceId,
            canonical: true,
            createdAt: publishedAt,
          }),
        database
          .insert(redirects)
          .values({
            fromPath: resource.path,
            toPath: draft.path,
            statusCode: 301,
            createdAt: publishedAt,
          })
          .onConflictDoUpdate({
            target: redirects.fromPath,
            set: { toPath: draft.path, statusCode: 301 },
          }),
      );
    }
    statements.push(
      ...(input.additionalStatements ?? []),
      update,
      event,
      // FTS is part of the same D1 transaction as the lifecycle transition.
      // A virtual-table failure therefore rolls back publication instead of
      // leaving a published row followed by an unsafe scheduler retry.
      searchDelete,
      searchInsert,
    );
    await database.batch(
      statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]],
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("malformed JSON")) {
      throw new ResourcePublicationConflictError(
        "Resource changed while publication was being prepared.",
        { cause: error },
      );
    }
    throw error;
  }

  return {
    ...resource,
    title: draft.title,
    slug: draft.slug,
    path: draft.path,
    description: draft.description,
    visibility: draft.visibility,
    status: "published" as ResourceStatus,
    publishedRevisionId: draft.revisionId,
    publishedAt,
  };
}

type ResourceGroupPublicationInput = {
  resourceIds: readonly string[];
  published: boolean;
  actorId?: string | null;
  /** Revisions whose normalized side projections are being committed. */
  expectedCurrentRevisionIds?: Readonly<Record<string, string>>;
  /** Full lifecycle snapshots frozen by a caller such as the scheduler. */
  expectedLifecycles?: Readonly<Record<string, ResourceLifecycleSnapshot>>;
  /** Domain-owned snapshot guards that must pass before any mutation. */
  guardStatements?: readonly BatchItem<"sqlite">[];
  /** Domain-owned side-table writes that must commit with publication. */
  additionalStatements?: readonly BatchItem<"sqlite">[];
};

/**
 * Publishes or unpublishes a related resource group in one D1 transaction.
 *
 * D1 executes `batch()` transactionally. Keeping every mutation in this one
 * batch prevents a visible album with only some published tracks (or the
 * inverse) when the final statement fails. JSON table parameters keep the
 * statement shape below D1's bind-variable ceiling as the group grows.
 */
export async function setResourceGroupPublished(
  input: ResourceGroupPublicationInput,
  database: typeof db = db,
) {
  const resourceIds = [...new Set(input.resourceIds)];
  if (resourceIds.length === 0) return { published: input.published, count: 0 };

  const resourceIdsJson = JSON.stringify(resourceIds);
  const members = await database
    .select({
      id: resources.id,
      path: resources.path,
      currentRevisionId: resources.currentRevisionId,
      publishedRevisionId: resources.publishedRevisionId,
      status: resources.status,
      scheduledAt: resources.scheduledAt,
      revisionPath: resourceRevisions.path,
    })
    .from(resources)
    .innerJoin(
      resourceRevisions,
      eq(resourceRevisions.id, resources.currentRevisionId),
    )
    .where(sql`${resources.id} in (
      select value from json_each(${resourceIdsJson})
    )`);

  if (members.length !== resourceIds.length) {
    const found = new Set(members.map((member) => member.id));
    const missing = resourceIds.filter((id) => !found.has(id));
    throw new Error(`Resource group is incomplete: ${missing.join(", ")}`);
  }
  const expectedCurrentRevisionIds = input.expectedCurrentRevisionIds ?? {};
  for (const [resourceId, expectedRevisionId] of Object.entries(expectedCurrentRevisionIds)) {
    const member = members.find((candidate) => candidate.id === resourceId);
    if (!member || member.currentRevisionId !== expectedRevisionId) {
      throw new ResourcePublicationConflictError(
        "Resource group changed while publication was being prepared.",
      );
    }
  }
  for (const [resourceId, expectedLifecycle] of Object.entries(
    input.expectedLifecycles ?? {},
  )) {
    const member = members.find((candidate) => candidate.id === resourceId);
    if (!member || !sameResourceLifecycle(member, expectedLifecycle)) {
      throw new ResourcePublicationConflictError(
        "Resource group changed while publication was being prepared.",
      );
    }
  }
  const archivedMember = members.find((member) => member.status === "archived");
  if (archivedMember) {
    throw new Error(`Resource ${archivedMember.id} is archived.`);
  }

  const now = new Date();
  const frozenMembersJson = JSON.stringify(members.map((member) => ({
    id: member.id,
    currentRevisionId: member.currentRevisionId,
    publishedRevisionId: member.publishedRevisionId,
    status: member.status,
    scheduledAt: member.scheduledAt
      ? Math.floor(member.scheduledAt.getTime() / 1_000)
      : null,
  })));
  const groupSnapshotIsCurrent = sql`NOT EXISTS (
    SELECT 1
    FROM json_each(${frozenMembersJson}) AS frozen_member
    LEFT JOIN resources AS live_resource
      ON live_resource.id = json_extract(frozen_member.value, '$.id')
    WHERE live_resource.id IS NULL
      OR live_resource.current_revision_id IS NOT json_extract(frozen_member.value, '$.currentRevisionId')
      OR live_resource.published_revision_id IS NOT json_extract(frozen_member.value, '$.publishedRevisionId')
      OR live_resource.status IS NOT json_extract(frozen_member.value, '$.status')
      OR live_resource.scheduled_at IS NOT json_extract(frozen_member.value, '$.scheduledAt')
  )`;
  const frozenCurrentRevisionId = sql`(
    SELECT json_extract(frozen_member.value, '$.currentRevisionId')
    FROM json_each(${frozenMembersJson}) AS frozen_member
    WHERE json_extract(frozen_member.value, '$.id') = ${resources.id}
  )`;
  const changedRoutes = members.filter(
    (member) => input.published && member.path !== member.revisionPath,
  );
  const changedRoutesJson = JSON.stringify(changedRoutes.map((member) => ({
    id: member.id,
    path: member.path,
  })));
  const statements: BatchItem<"sqlite">[] = [
    // D1 batch() is transactional, but the immutable revision snapshot was
    // selected before the transaction began. Force the first statement to
    // fail if any member pointer changed in that window; all route, side-table
    // and publication writes are then rolled back/not executed together.
    database.select({
      guard: sql`json_extract(
        CASE WHEN ${groupSnapshotIsCurrent}
          THEN '{}'
          ELSE 'RESOURCE_GROUP_PUBLICATION_CONFLICT'
        END,
        '$'
      )`,
    }).from(sql`(SELECT 1)`),
  ];
  statements.push(...(input.guardStatements ?? []));

  if (changedRoutes.length > 0) {
    statements.push(
      database
        .insert(redirects)
        .values(changedRoutes.map((member) => ({
          fromPath: member.path,
          toPath: member.revisionPath,
          statusCode: 301,
          createdAt: now,
        })))
        .onConflictDoUpdate({
          target: redirects.fromPath,
          set: {
            toPath: sql`excluded.to_path`,
            statusCode: 301,
          },
        }),
      database
        .delete(resourceRoutes)
        .where(sql`EXISTS (
          SELECT 1
          FROM json_each(${changedRoutesJson}) AS changed_route
          WHERE ${resourceRoutes.path} = json_extract(changed_route.value, '$.path')
            AND ${resourceRoutes.resourceId} = json_extract(changed_route.value, '$.id')
        )`),
      // A concurrent/foreign owner must fail this INSERT. Because it is in the
      // same batch, D1 rolls back redirects, route deletes and publication.
      database.insert(resourceRoutes).values(changedRoutes.map((member) => ({
        path: member.revisionPath,
        resourceId: member.id,
        canonical: true,
        createdAt: now,
      }))),
    );
  }

  // Album/track presentation fields live in normalized side tables for
  // querying, while the immutable revision metadata is the public snapshot.
  // Apply side-table projections inside this transaction so a failed publish
  // can never expose the old published revision with newly edited side data.
  statements.push(...(input.additionalStatements ?? []));

  if (input.published) {
    statements.push(
      database
        .update(resources)
        .set({
          title: sql`(select frozen_revision.title from resource_revisions as frozen_revision where frozen_revision.id = ${frozenCurrentRevisionId})`,
          slug: sql`(select frozen_revision.slug from resource_revisions as frozen_revision where frozen_revision.id = ${frozenCurrentRevisionId})`,
          path: sql`(select frozen_revision.path from resource_revisions as frozen_revision where frozen_revision.id = ${frozenCurrentRevisionId})`,
          description: sql`(select frozen_revision.description from resource_revisions as frozen_revision where frozen_revision.id = ${frozenCurrentRevisionId})`,
          visibility: sql`(select frozen_revision.visibility from resource_revisions as frozen_revision where frozen_revision.id = ${frozenCurrentRevisionId})`,
          status: "published",
          publishedRevisionId: frozenCurrentRevisionId,
          publishedAt: now,
          scheduledAt: null,
          updatedAt: now,
        })
        .where(sql`${resources.id} in (
          select value from json_each(${resourceIdsJson})
        )`),
    );
  } else {
    statements.push(
      database
        .update(resources)
        .set({
          status: "draft",
          publishedRevisionId: null,
          publishedAt: null,
          scheduledAt: null,
          updatedAt: now,
        })
        .where(sql`${resources.id} in (
          select value from json_each(${resourceIdsJson})
        )`),
    );
  }

  const eventRows = members.map((member) => ({
    id: crypto.randomUUID(),
    resourceId: member.id,
    revisionId: input.published
      ? member.currentRevisionId
      : member.publishedRevisionId,
    eventType: input.published ? "published" : "unpublished",
    actorId: input.actorId ?? null,
  }));
  statements.push(
    database.insert(publicationEvents).select(
      database
        .select({
          id: sql<string>`json_extract(value, '$.id')`.as("id"),
          resourceId: sql<string>`json_extract(value, '$.resourceId')`.as("resource_id"),
          revisionId: sql<string | null>`json_extract(value, '$.revisionId')`.as("revision_id"),
          eventType: sql<"published" | "unpublished">`json_extract(value, '$.eventType')`.as("event_type"),
          actorId: sql<string | null>`json_extract(value, '$.actorId')`.as("actor_id"),
          dataJson: sql<string>`'{}'`.as("data_json"),
          createdAt: sql<number>`${Math.floor(now.getTime() / 1_000)}`.as("created_at"),
        })
        .from(sql`json_each(${JSON.stringify(eventRows)})`),
    ),
    // Music is not a public search collection. Removing any historical FTS
    // rows is both sufficient and keeps the entire publication write atomic.
    database
      .delete(resourceSearchTable)
      .where(sql`${resourceSearchTable.resourceId} in (
        select value from json_each(${resourceIdsJson})
      )`),
  );

  try {
    await database.batch(
      statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]],
    );
  } catch (error) {
    if (/malformed JSON/i.test(error instanceof Error ? error.message : String(error))) {
      throw new ResourcePublicationConflictError(
        "Resource group changed while publication was being prepared.",
        { cause: error },
      );
    }
    throw error;
  }
  return { published: input.published, count: resourceIds.length };
}

function sameInstant(left: Date | null, right: Date | null) {
  return left === null || right === null
    ? left === right
    : left.getTime() === right.getTime();
}

function sameResourceLifecycle(
  left: ResourceLifecycleSnapshot,
  right: ResourceLifecycleSnapshot,
) {
  return left.id === right.id
    && left.currentRevisionId === right.currentRevisionId
    && left.publishedRevisionId === right.publishedRevisionId
    && left.status === right.status
    && sameInstant(left.scheduledAt, right.scheduledAt);
}

function resourceLifecycleGuard(
  resource: ResourceLifecycleSnapshot,
  database: typeof db = db,
) {
  const scheduledAt = resource.scheduledAt
    ? Math.floor(resource.scheduledAt.getTime() / 1_000)
    : null;
  return database.select({
    guard: sql`json_extract(
      CASE WHEN EXISTS (
        SELECT 1
        FROM resources AS live_resource
        WHERE live_resource.id = ${resource.id}
          AND live_resource.current_revision_id IS ${resource.currentRevisionId}
          AND live_resource.published_revision_id IS ${resource.publishedRevisionId}
          AND live_resource.status = ${resource.status}
          AND live_resource.scheduled_at IS ${scheduledAt}
      )
        THEN '{}'
        ELSE 'RESOURCE_LIFECYCLE_CONFLICT'
      END,
      '$'
    )`,
  }).from(sql`(SELECT 1)`);
}

export async function scheduleCurrentRevision(input: {
  resourceId: string;
  scheduledAt: Date;
  actorId?: string | null;
  expectedCurrentRevisionId?: string;
}, database: typeof db = db) {
  const resource = await findResourceIdentity(input.resourceId, database);
  if (!resource?.currentRevisionId) return null;
  if (
    input.expectedCurrentRevisionId !== undefined
    && resource.currentRevisionId !== input.expectedCurrentRevisionId
  ) {
    throw new Error("Resource changed while scheduling was being prepared.");
  }
  if (resource.status === "archived") {
    throw new Error(`Resource ${input.resourceId} is archived.`);
  }
  if (input.scheduledAt <= new Date()) {
    throw new Error("Scheduled publication time must be in the future.");
  }

  const now = new Date();
  const status: ResourceStatus = resource.publishedRevisionId
    ? "published"
    : "scheduled";
  try {
    await database.batch([
      resourceLifecycleGuard(resource, database),
      database
        .update(resources)
        .set({ status, scheduledAt: input.scheduledAt, updatedAt: now })
        .where(and(
          eq(resources.id, input.resourceId),
          sql`${resources.currentRevisionId} IS ${resource.currentRevisionId}`,
          sql`${resources.publishedRevisionId} IS ${resource.publishedRevisionId}`,
          eq(resources.status, resource.status),
        )),
      database.insert(publicationEvents).values({
        id: crypto.randomUUID(),
        resourceId: input.resourceId,
        revisionId: resource.currentRevisionId,
        eventType: "scheduled",
        actorId: input.actorId,
        createdAt: now,
      }),
    ] as const);
  } catch (error) {
    if (error instanceof Error && error.message.includes("malformed JSON")) {
      throw new Error("Resource changed while scheduling was being prepared.", {
        cause: error,
      });
    }
    throw error;
  }

  return { ...resource, status, scheduledAt: input.scheduledAt };
}

export async function archiveResources(
  resourceIds: string[],
  actorId?: string | null,
  options: { guardStatements?: readonly BatchItem<"sqlite">[] } = {},
  database: typeof db = db,
) {
  if (resourceIds.length === 0) return 0;
  const now = new Date();
  const uniqueIds = [...new Set(resourceIds)];
  const resourceIdsJson = JSON.stringify(uniqueIds);
  const eventRows = uniqueIds.map((resourceId) => ({
    id: crypto.randomUUID(),
    resourceId,
    actorId: actorId ?? null,
  }));
  const mutations = [
    database
      .update(resources)
      .set({ status: "archived", scheduledAt: null, updatedAt: now })
      .where(sql`${resources.id} in (
        select value from json_each(${resourceIdsJson})
      )`),
    database.insert(publicationEvents).select(
      database
        .select({
          id: sql<string>`json_extract(value, '$.id')`.as("id"),
          resourceId: sql<string>`json_extract(value, '$.resourceId')`.as("resource_id"),
          revisionId: sql<string | null>`NULL`.as("revision_id"),
          eventType: sql<"archived">`'archived'`.as("event_type"),
          actorId: sql<string | null>`json_extract(value, '$.actorId')`.as("actor_id"),
          dataJson: sql<string>`'{}'`.as("data_json"),
          createdAt: sql<number>`${Math.floor(now.getTime() / 1_000)}`.as("created_at"),
        })
        .from(sql`json_each(${JSON.stringify(eventRows)})`),
    ),
    database
      .delete(resourceSearchTable)
      .where(sql`${resourceSearchTable.resourceId} in (
        select value from json_each(${resourceIdsJson})
      )`),
  ] as const;

  try {
    const guardStatements = options.guardStatements ?? [];
    if (guardStatements.length > 0) {
      const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
        guardStatements[0]!,
        ...guardStatements.slice(1),
        ...mutations,
      ];
      await database.batch(statements);
    } else {
      await database.batch(mutations);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("malformed JSON")) {
      throw new Error("Resource group changed while archive was being prepared.", {
        cause: error,
      });
    }
    throw error;
  }
  return uniqueIds.length;
}

export async function unpublishResourceRecord(
  resourceId: string,
  actorId?: string | null,
  database: typeof db = db,
) {
  const resource = await findResourceIdentity(resourceId, database);
  if (!resource) return null;
  if (resource.status === "archived") {
    throw new Error(`Resource ${resourceId} is archived.`);
  }

  const now = new Date();
  try {
    await database.batch([
      resourceLifecycleGuard(resource, database),
      database
        .update(resources)
        .set({
          status: "draft",
          publishedRevisionId: null,
          publishedAt: null,
          scheduledAt: null,
          updatedAt: now,
        })
        .where(and(
          eq(resources.id, resourceId),
          sql`${resources.currentRevisionId} IS ${resource.currentRevisionId}`,
          sql`${resources.publishedRevisionId} IS ${resource.publishedRevisionId}`,
          eq(resources.status, resource.status),
        )),
      database.insert(publicationEvents).values({
        id: crypto.randomUUID(),
        resourceId,
        revisionId: resource.publishedRevisionId,
        eventType: "unpublished",
        actorId,
        createdAt: now,
      }),
      database
        .delete(resourceSearchTable)
        .where(eq(resourceSearchTable.resourceId, resourceId)),
    ] as const);
  } catch (error) {
    if (error instanceof Error && error.message.includes("malformed JSON")) {
      throw new Error("Resource changed while unpublishing was being prepared.", {
        cause: error,
      });
    }
    throw error;
  }
  return {
    ...resource,
    status: "draft" as ResourceStatus,
    publishedRevisionId: null,
    publishedAt: null,
    scheduledAt: null,
  };
}
