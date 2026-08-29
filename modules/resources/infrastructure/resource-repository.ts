import { and, count, desc, eq, inArray, like, max, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
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

const publishedSelection = {
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
  content: resourceRevisions.content,
  contentFormat: resourceRevisions.contentFormat,
  metadataJson: resourceRevisions.metadataJson,
};

export async function findPublishedResourceByPath(path: string) {
  const [result] = await db
    .select(publishedSelection)
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

  return (result ?? null) as PublishedResource | null;
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
    .where(and(eq(resources.status, "published"), eq(resources.visibility, "public"), like(resources.path, `${prefix}/%`)))
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
    .where(
      and(
        eq(resources.status, "published"),
        eq(resources.visibility, "public")
      )
    )
    .orderBy(desc(resources.updatedAt));
}

export async function countPublishedResources(type?: ResourceType) {
  const conditions = [
    eq(resources.status, "published"),
    eq(resources.visibility, "public"),
  ];
  if (type) conditions.push(eq(resources.type, type));

  const [result] = await db
    .select({ total: count() })
    .from(resources)
    .where(and(...conditions));
  return result?.total ?? 0;
}

export async function searchPublishedResources(query: string, limit = 30) {
  const tokens = query
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}_-]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);

  if (tokens.length === 0) return [];
  const match = tokens.map((token) => `"${token.replaceAll('"', '""')}"*`).join(" AND ");

  const rows = await db.all<{
    id: string;
    type: ResourceType;
    title: string;
    slug: string;
    path: string;
    description: string | null;
    visibility: ResourceVisibility;
    coverAssetId: string | null;
    publishedAt: number | null;
    revisionId: string;
    version: number;
    content: string;
    contentFormat: ContentFormat;
    metadataJson: string;
  }>(sql`
    SELECT
      r.id,
      r.type,
      r.title,
      r.slug,
      r.path,
      r.description,
      r.visibility,
      r.cover_asset_id AS coverAssetId,
      r.published_at AS publishedAt,
      rr.id AS revisionId,
      rr.version,
      rr.content,
      rr.content_format AS contentFormat,
      rr.metadata_json AS metadataJson
    FROM resource_search
    JOIN resources r ON r.id = resource_search.resource_id
    JOIN resource_revisions rr ON rr.id = r.published_revision_id
    WHERE resource_search MATCH ${match}
      AND r.status = 'published'
      AND r.visibility = 'public'
    ORDER BY bm25(resource_search), r.published_at DESC
    LIMIT ${Math.min(Math.max(limit, 1), 100)}
  `);

  return rows.map((row) => ({
    ...row,
    publishedAt: row.publishedAt === null ? null : new Date(row.publishedAt),
  })) satisfies PublishedResource[];
}

export async function findRedirectByPath(path: string) {
  const [result] = await db
    .select({ toPath: redirects.toPath, statusCode: redirects.statusCode })
    .from(redirects)
    .where(eq(redirects.fromPath, path))
    .limit(1);
  return result ?? null;
}

export async function findResourceIdentity(id: string) {
  const [resource] = await db
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
  revision: typeof resourceRevisions.$inferInsert;
  actorId?: string | null;
}) {
  const now = new Date();
  const resourceUpdate: Partial<typeof resources.$inferInsert> = {
    currentRevisionId: input.revision.id,
    updatedAt: now,
  };

  const queries = [
    db.insert(resourceRevisions).values(input.revision),
    db
      .update(resources)
      .set(resourceUpdate)
      .where(eq(resources.id, input.resourceId)),
    db.insert(publicationEvents).values({
      id: crypto.randomUUID(),
      resourceId: input.resourceId,
      revisionId: input.revision.id,
      eventType: "draft_saved",
      actorId: input.actorId,
      createdAt: now,
    }),
  ] as const;

  await db.batch(queries);
}

export async function publishCurrentRevision(input: {
  resourceId: string;
  actorId?: string | null;
  publishedAt?: Date;
}) {
  const resource = await findResourceIdentity(input.resourceId);
  if (!resource?.currentRevisionId) return null;

  const draft = await findEditableResourceById(input.resourceId);
  if (!draft) return null;

  const [routeOwner] = await db
    .select({ resourceId: resourceRoutes.resourceId })
    .from(resourceRoutes)
    .where(eq(resourceRoutes.path, draft.path))
    .limit(1);
  if (routeOwner && routeOwner.resourceId !== input.resourceId) {
    throw new Error(`Resource path ${draft.path} is already in use.`);
  }

  const publishedAt = input.publishedAt ?? new Date();
  const update = db
    .update(resources)
    .set({
      title: draft.title,
      slug: draft.slug,
      path: draft.path,
      description: draft.description,
      visibility: draft.visibility,
      status: "published",
      publishedRevisionId: resource.currentRevisionId,
      publishedAt,
      scheduledAt: null,
      updatedAt: publishedAt,
    })
    .where(eq(resources.id, input.resourceId));
  const event = db.insert(publicationEvents).values({
    id: crypto.randomUUID(),
    resourceId: input.resourceId,
    revisionId: resource.currentRevisionId,
    eventType: "published",
    actorId: input.actorId,
    createdAt: publishedAt,
  });

  if (draft.path !== resource.path) {
    await db.batch([
      db.delete(resourceRoutes).where(eq(resourceRoutes.path, resource.path)),
      db
        .insert(resourceRoutes)
        .values({
          path: draft.path,
          resourceId: input.resourceId,
          canonical: true,
          createdAt: publishedAt,
        })
        .onConflictDoUpdate({
          target: resourceRoutes.path,
          set: { resourceId: input.resourceId, canonical: true },
        }),
      db
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
      update,
      event,
    ] as const);
  } else {
    await db.batch([update, event] as const);
  }

  return {
    ...resource,
    title: draft.title,
    slug: draft.slug,
    path: draft.path,
    description: draft.description,
    visibility: draft.visibility,
    status: "published" as ResourceStatus,
    publishedRevisionId: resource.currentRevisionId,
    publishedAt,
  };
}

export async function scheduleCurrentRevision(input: {
  resourceId: string;
  scheduledAt: Date;
  actorId?: string | null;
}) {
  const resource = await findResourceIdentity(input.resourceId);
  if (!resource?.currentRevisionId) return null;
  if (input.scheduledAt <= new Date()) {
    throw new Error("Scheduled publication time must be in the future.");
  }

  const now = new Date();
  const status = resource.publishedRevisionId ? "published" : "scheduled";
  await db.batch([
    db
      .update(resources)
      .set({ status, scheduledAt: input.scheduledAt, updatedAt: now })
      .where(eq(resources.id, input.resourceId)),
    db.insert(publicationEvents).values({
      id: crypto.randomUUID(),
      resourceId: input.resourceId,
      revisionId: resource.currentRevisionId,
      eventType: "scheduled",
      actorId: input.actorId,
      createdAt: now,
    }),
  ] as const);

  return { ...resource, status, scheduledAt: input.scheduledAt };
}

export async function archiveResources(resourceIds: string[], actorId?: string | null) {
  if (resourceIds.length === 0) return 0;
  const now = new Date();
  const uniqueIds = [...new Set(resourceIds)];

  await db.batch([
    db
      .update(resources)
      .set({ status: "archived", updatedAt: now })
      .where(inArray(resources.id, uniqueIds)),
    db.insert(publicationEvents).values(
      uniqueIds.map((resourceId) => ({
        id: crypto.randomUUID(),
        resourceId,
        eventType: "archived" as const,
        actorId,
        createdAt: now,
      }))
    ),
  ] as const);

  for (const resourceId of uniqueIds) {
    await db.run(sql`DELETE FROM resource_search WHERE resource_id = ${resourceId}`);
  }
  return uniqueIds.length;
}

export async function unpublishResourceRecord(
  resourceId: string,
  actorId?: string | null
) {
  const resource = await findResourceIdentity(resourceId);
  if (!resource) return null;

  const now = new Date();
  await db.batch([
    db
      .update(resources)
      .set({
        status: "draft",
        publishedRevisionId: null,
        publishedAt: null,
        scheduledAt: null,
        updatedAt: now,
      })
      .where(eq(resources.id, resourceId)),
    db.insert(publicationEvents).values({
      id: crypto.randomUUID(),
      resourceId,
      revisionId: resource.publishedRevisionId,
      eventType: "unpublished",
      actorId,
      createdAt: now,
    }),
  ] as const);
  await db.run(sql`DELETE FROM resource_search WHERE resource_id = ${resourceId}`);
  return { ...resource, status: "draft" as ResourceStatus };
}

export async function synchronizeSearchIndex(resourceId: string) {
  await db.run(sql`DELETE FROM resource_search WHERE resource_id = ${resourceId}`);
  await db.run(sql`
    INSERT INTO resource_search (resource_id, title, description, content, tokens)
    SELECT
      ${resources.id},
      ${resourceRevisions.title},
      coalesce(${resourceRevisions.description}, ''),
      ${resourceRevisions.content},
      lower(${resourceRevisions.title} || ' ' || coalesce(${resourceRevisions.description}, ''))
    FROM ${resources}
    JOIN ${resourceRevisions}
      ON ${resourceRevisions.id} = ${resources.publishedRevisionId}
    WHERE ${resources.id} = ${resourceId}
      AND ${resources.status} = 'published'
      AND (
        ${resources.type} <> 'article'
        OR coalesce(json_extract(${resourceRevisions.metadataJson}, '$.search'), 1) = 1
      )
  `);
}
