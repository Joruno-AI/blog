import { and, eq, inArray, max, ne, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { z } from "zod";

import { db } from "@/lib/db";
import { assets, resourceAlbums, resources, tracks } from "@/lib/db/schema";
import {
  albumMutableFieldsFromRevision,
  parseMusicRevisionMetadata,
  trackMutableFieldsFromRevision,
} from "@/lib/db/queries/music-snapshot";
import {
  archiveResourceIds,
  createResource,
  publishResource,
  saveResourceRevision,
} from "@/modules/resources/application/commands";
import { getStudioResource } from "@/modules/resources/application/queries";
import { resourceSlug } from "@/modules/resources/domain/slug";
import {
  archiveResources,
  setResourceGroupPublished,
} from "@/modules/resources/infrastructure/resource-repository";
import type {
  ResourceLifecycleSnapshot,
} from "@/modules/resources/infrastructure/resource-repository";
import { musicResourceIdCandidates } from "@/modules/music/domain/id";

const albumInputSchema = z.object({
  name: z.string().trim().min(1).max(300),
  slug: z.string().trim().max(500).optional(),
  artist: z.string().trim().min(1).max(300),
  description: z.string().max(4_000).nullable().optional(),
  cover: z.string().url().max(2_000).nullable().optional().or(z.literal("")),
  color: z.string().max(50).nullable().optional(),
  releaseDate: z.coerce.date().nullable().optional(),
  published: z.boolean().default(false),
  order: z.number().int().default(0),
  actorId: z.string().nullable().optional(),
});

const trackInputSchema = z.object({
  albumId: z.string().min(1),
  name: z.string().trim().min(1).max(300),
  duration: z.string().max(50).nullable().optional(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
  url: z.string().url().max(2_000).nullable().optional().or(z.literal("")),
  externalUrl: z.string().url().max(2_000).nullable().optional().or(z.literal("")),
  sourceType: z.enum(["upload", "external"]).default("upload"),
  trackNumber: z.number().int().positive().optional(),
  lyrics: z.string().nullable().optional(),
  actorId: z.string().nullable().optional(),
});

export type AlbumMutationInput = z.input<typeof albumInputSchema>;
export type TrackMutationInput = z.input<typeof trackInputSchema>;

export const musicSlug = resourceSlug;

type NormalizedTrackFields = {
  albumResourceId: string;
  audioAssetId: string | null;
  duration: string | null;
  durationSeconds: number | null;
  externalUrl: string | null;
  sourceType: "upload" | "external";
  trackNumber: number;
  url: string | null;
  lyrics: string | null;
};

async function findAssetId(url: string | null | undefined) {
  if (!url) return null;
  const [asset] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(eq(assets.url, url))
    .limit(1);
  return asset?.id ?? null;
}

export async function resolveMusicResourceId(
  id: string,
  type: "album" | "track"
) {
  const candidates = musicResourceIdCandidates(id, type);
  const [resource] = await db
    .select({ id: resources.id })
    .from(resources)
    .where(and(inArray(resources.id, candidates), eq(resources.type, type)))
    .limit(1);
  return resource?.id ?? null;
}

function albumRevisionMetadata(input: {
  artist: string;
  color: string | null;
  cover: string | null;
  releaseDate: Date | null;
  order: number;
}) {
  return {
    artist: input.artist,
    color: input.color,
    cover: input.cover,
    releaseDate: input.releaseDate?.toISOString() ?? null,
    order: input.order,
  };
}

function trackRevisionMetadata(input: NormalizedTrackFields) {
  return {
    duration: input.duration,
    durationSeconds: input.durationSeconds,
    url: input.url,
    externalUrl: input.externalUrl,
    sourceType: input.sourceType,
    trackNumber: input.trackNumber,
  };
}

function albumFieldStatements(input: {
  resourceId: string;
  artist: string;
  color: string | null;
  releaseDate: Date | null;
  order: number;
  coverAssetId: string | null;
}, database: typeof db = db): [BatchItem<"sqlite">, BatchItem<"sqlite">] {
  return [
    database
      .insert(resourceAlbums)
      .values({
        resourceId: input.resourceId,
        artist: input.artist,
        color: input.color,
        releaseDate: input.releaseDate,
        sortOrder: input.order,
      })
      .onConflictDoUpdate({
        target: resourceAlbums.resourceId,
        set: {
          artist: input.artist,
          color: input.color,
          releaseDate: input.releaseDate,
          sortOrder: input.order,
        },
      }),
    database
      .update(resources)
      .set({ coverAssetId: input.coverAssetId, updatedAt: new Date() })
      .where(eq(resources.id, input.resourceId)),
  ];
}

async function applyAlbumFields(input: Parameters<typeof albumFieldStatements>[0]) {
  await db.batch(albumFieldStatements(input));
}

function trackFieldStatement(
  resourceId: string,
  input: NormalizedTrackFields,
  database: typeof db = db,
) {
  return database.update(tracks).set({
    albumResourceId: input.albumResourceId,
    audioAssetId: input.audioAssetId,
    externalUrl: input.externalUrl,
    sourceType: input.sourceType,
    duration: input.duration,
    durationSeconds: input.durationSeconds,
    trackNumber: input.trackNumber,
    lyrics: input.lyrics,
  }).where(eq(tracks.resourceId, resourceId));
}

type ResourcePublicationState = Pick<
  typeof resources.$inferSelect,
  "id" | "currentRevisionId" | "publishedRevisionId" | "status"
>;

async function readResourcePublicationState(
  resourceId: string,
  database: typeof db = db,
) {
  const [state] = await database
    .select({
      id: resources.id,
      currentRevisionId: resources.currentRevisionId,
      publishedRevisionId: resources.publishedRevisionId,
      status: resources.status,
    })
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);
  return state ?? null;
}

function resourcePublicationStateGuard(
  state: ResourcePublicationState,
  database: typeof db = db,
) {
  return database.select({
    guard: sql`json_extract(
      CASE WHEN EXISTS (
        SELECT 1
        FROM resources AS live_resource
        WHERE live_resource.id = ${state.id}
          AND live_resource.current_revision_id IS ${state.currentRevisionId}
          AND live_resource.published_revision_id IS ${state.publishedRevisionId}
          AND live_resource.status = ${state.status}
      )
        THEN '{}'
        ELSE 'RESOURCE_PUBLICATION_STATE_CONFLICT'
      END,
      '$'
    )`,
  }).from(sql`(SELECT 1)`);
}

function isPublicationSnapshotConflict(error: unknown) {
  return error instanceof Error && (
    error.message.includes("malformed JSON")
    || error.message.includes("changed while publication was being prepared")
  );
}

function revisionConflict(resourceId: string) {
  return new Error(
    `Resource ${resourceId} changed while its music projection was being prepared.`,
  );
}

async function commitTrackProjection(input: {
  resourceId: string;
  expectedRevisionId: string;
  actorId?: string | null;
  additionalStatements: readonly BatchItem<"sqlite">[];
}, database: typeof db = db) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const state = await readResourcePublicationState(input.resourceId, database);
    if (!state || state.currentRevisionId !== input.expectedRevisionId) {
      throw revisionConflict(input.resourceId);
    }
    const stateGuard = resourcePublicationStateGuard(state, database);
    try {
      if (state.status === "published") {
        await setResourceGroupPublished({
          resourceIds: [input.resourceId],
          published: true,
          actorId: input.actorId,
          expectedCurrentRevisionIds: {
            [input.resourceId]: input.expectedRevisionId,
          },
          guardStatements: [stateGuard],
          additionalStatements: input.additionalStatements,
        }, database);
      } else {
        await database.batch([
          stateGuard,
          ...input.additionalStatements,
        ] as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
      }
      return;
    } catch (error) {
      if (!isPublicationSnapshotConflict(error) || attempt === 2) throw error;
    }
  }
}

async function commitAlbumProjection(input: {
  resourceId: string;
  expectedRevisionId: string;
  published?: boolean;
  actorId?: string | null;
  additionalStatements: readonly BatchItem<"sqlite">[];
}, database: typeof db = db) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const state = await readResourcePublicationState(input.resourceId, database);
    if (!state || state.currentRevisionId !== input.expectedRevisionId) {
      throw revisionConflict(input.resourceId);
    }
    const stateGuard = resourcePublicationStateGuard(state, database);
    const desiredPublished = input.published ?? state.status === "published";
    try {
      if (desiredPublished || state.status === "published") {
        await setAlbumResourceGroupPublished({
          resourceId: input.resourceId,
          published: desiredPublished,
          actorId: input.actorId,
          expectedCurrentRevisionIds: {
            [input.resourceId]: input.expectedRevisionId,
          },
          guardStatements: [stateGuard],
          additionalStatements: input.additionalStatements,
        }, database);
      } else {
        await database.batch([
          stateGuard,
          ...input.additionalStatements,
        ] as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
      }
      return;
    } catch (error) {
      if (!isPublicationSnapshotConflict(error) || attempt === 2) throw error;
    }
  }
}

async function attachNewTrackToAlbum(input: {
  albumResourceId: string;
  trackResourceId: string;
  trackRevisionId: string;
  actorId?: string | null;
  relationStatement: BatchItem<"sqlite">;
}, database: typeof db = db) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const albumState = await readResourcePublicationState(
      input.albumResourceId,
      database,
    );
    if (!albumState) throw new Error(`Album ${input.albumResourceId} was not found.`);
    if (albumState.status === "archived") {
      throw new Error(`Album ${input.albumResourceId} is archived.`);
    }
    const albumStateGuard = resourcePublicationStateGuard(albumState, database);
    try {
      if (albumState.status === "published") {
        await setResourceGroupPublished({
          resourceIds: [input.trackResourceId],
          published: true,
          actorId: input.actorId,
          expectedCurrentRevisionIds: {
            [input.trackResourceId]: input.trackRevisionId,
          },
          guardStatements: [albumStateGuard],
          additionalStatements: [input.relationStatement],
        }, database);
      } else {
        await database.batch([
          albumStateGuard,
          input.relationStatement,
        ] as const);
      }
      return;
    } catch (error) {
      if (!isPublicationSnapshotConflict(error) || attempt === 2) throw error;
    }
  }
}

async function normalizedTrackFields(input: {
  albumResourceId: string;
  duration: string | null;
  durationSeconds: number | null;
  url: string | null;
  externalUrl: string | null;
  sourceType: "upload" | "external";
  trackNumber: number;
  lyrics: string | null;
}): Promise<NormalizedTrackFields> {
  const uploadUrl = input.url || null;
  const audioAssetId = input.sourceType === "upload"
    ? await findAssetId(uploadUrl)
    : null;
  const sourceType = input.sourceType === "upload" && audioAssetId
    ? "upload"
    : "external";
  return {
    ...input,
    audioAssetId,
    sourceType,
    url: sourceType === "upload" ? uploadUrl : null,
    externalUrl: input.sourceType === "external"
      ? input.externalUrl || null
      : audioAssetId ? null : uploadUrl,
  };
}

export async function createAlbumResource(input: AlbumMutationInput) {
  const parsed = albumInputSchema.parse(input);
  const slug = musicSlug(parsed.slug || parsed.name);
  if (!slug) throw new Error("Album slug is empty after normalization.");
  const cover = parsed.cover || null;
  const coverAssetId = await findAssetId(cover);
  const albumFields = {
    artist: parsed.artist,
    color: parsed.color ?? "#1a1a2e",
    releaseDate: parsed.releaseDate ?? null,
    order: parsed.order,
  };
  const created = await createResource({
    type: "album",
    title: parsed.name,
    slug,
    path: `/music/albums/${slug}`,
    description: parsed.description ?? null,
    visibility: "public",
    content: parsed.description ?? "",
    contentFormat: "markdown",
    metadata: albumRevisionMetadata({ ...albumFields, cover }),
    authorId: parsed.actorId,
    changeSummary: "Created in Studio",
  });
  await applyAlbumFields({
    resourceId: created.id,
    ...albumFields,
    coverAssetId,
  });
  if (parsed.published) {
    await publishResource(created.id, parsed.actorId, parsed.releaseDate ?? undefined, {
      expectedCurrentRevisionId: created.revisionId,
    });
  }
  return created;
}

export async function updateAlbumResource(id: string, input: AlbumMutationInput) {
  const resourceId = await resolveMusicResourceId(id, "album");
  if (!resourceId) throw new Error(`Album ${id} was not found.`);
  const current = await getStudioResource(resourceId);
  if (!current || current.type !== "album") throw new Error(`Album ${id} was not found.`);
  const parsed = albumInputSchema.parse(input);
  const slug = musicSlug(parsed.slug || parsed.name);
  if (!slug) throw new Error("Album slug is empty after normalization.");
  const cover = parsed.cover || null;
  const coverAssetId = await findAssetId(cover);
  const albumFields = {
    artist: parsed.artist,
    color: parsed.color ?? "#1a1a2e",
    releaseDate: parsed.releaseDate ?? null,
    order: parsed.order,
  };
  const revision = await saveResourceRevision(resourceId, {
    expectedCurrentRevisionId: current.revisionId,
    title: parsed.name,
    slug,
    path: `/music/albums/${slug}`,
    description: parsed.description ?? null,
    visibility: "public",
    content: parsed.description ?? "",
    contentFormat: "markdown",
    metadata: {
      ...parseMusicRevisionMetadata(current.metadataJson),
      ...albumRevisionMetadata({ ...albumFields, cover }),
    },
    changeSummary: "Updated in Studio",
    actorId: parsed.actorId,
  });
  const additionalStatements = albumFieldStatements({
    resourceId,
    ...albumFields,
    coverAssetId,
  });
  await commitAlbumProjection({
    resourceId,
    expectedRevisionId: revision.revisionId,
    published: parsed.published,
    actorId: parsed.actorId,
    additionalStatements,
  });
  return { id: resourceId };
}

async function albumMembershipSnapshot(
  albumResourceId: string,
  database: typeof db = db,
) {
  const albumTrackRows = await database
    .select({ id: tracks.resourceId })
    .from(tracks)
    .innerJoin(resources, eq(resources.id, tracks.resourceId))
    .where(and(
      eq(tracks.albumResourceId, albumResourceId),
      ne(resources.status, "archived"),
    ));
  const frozenTrackIds = albumTrackRows.map((track) => track.id).sort();
  const frozenTrackIdsJson = JSON.stringify(frozenTrackIds);
  const guard = database.select({
    guard: sql`json_extract(
      CASE WHEN NOT EXISTS (
        SELECT active_track.resource_id
        FROM tracks AS active_track
        INNER JOIN resources AS active_resource
          ON active_resource.id = active_track.resource_id
        WHERE active_track.album_resource_id = ${albumResourceId}
          AND active_resource.status <> 'archived'
        EXCEPT
        SELECT value FROM json_each(${frozenTrackIdsJson})
      ) AND NOT EXISTS (
        SELECT value FROM json_each(${frozenTrackIdsJson})
        EXCEPT
        SELECT active_track.resource_id
        FROM tracks AS active_track
        INNER JOIN resources AS active_resource
          ON active_resource.id = active_track.resource_id
        WHERE active_track.album_resource_id = ${albumResourceId}
          AND active_resource.status <> 'archived'
      )
        THEN '{}'
        ELSE 'ALBUM_MEMBERSHIP_CONFLICT'
      END,
      '$'
    )`,
  }).from(sql`(SELECT 1)`);
  return { trackIds: frozenTrackIds, guard };
}

export async function setAlbumResourceGroupPublished(input: {
  resourceId: string;
  published: boolean;
  actorId?: string | null;
  expectedCurrentRevisionIds?: Readonly<Record<string, string>>;
  expectedLifecycles?: Readonly<Record<string, ResourceLifecycleSnapshot>>;
  guardStatements?: readonly BatchItem<"sqlite">[];
  additionalStatements?: readonly BatchItem<"sqlite">[];
}, database: typeof db = db) {
  const membership = await albumMembershipSnapshot(input.resourceId, database);
  return setResourceGroupPublished({
    resourceIds: [input.resourceId, ...membership.trackIds],
    published: input.published,
    actorId: input.actorId,
    expectedCurrentRevisionIds: input.expectedCurrentRevisionIds,
    expectedLifecycles: input.expectedLifecycles,
    guardStatements: [membership.guard, ...(input.guardStatements ?? [])],
    additionalStatements: input.additionalStatements,
  }, database);
}

export async function setAlbumPublished(id: string, published?: boolean) {
  const resourceId = await resolveMusicResourceId(id, "album");
  if (!resourceId) throw new Error(`Album ${id} was not found.`);
  const current = await getStudioResource(resourceId);
  if (!current) throw new Error(`Album ${id} was not found.`);
  const shouldPublish = published ?? current.status !== "published";
  await setAlbumResourceGroupPublished({ resourceId, published: shouldPublish });
  return shouldPublish;
}

export async function archiveAlbumResource(id: string) {
  const resourceId = await resolveMusicResourceId(id, "album");
  if (!resourceId) return 0;
  return archiveAlbumResourceGroup(resourceId);
}

export async function archiveAlbumResourceGroup(
  resourceId: string,
  database: typeof db = db,
) {
  const membership = await albumMembershipSnapshot(resourceId, database);
  return archiveResources(
    [resourceId, ...membership.trackIds],
    undefined,
    { guardStatements: [membership.guard] },
    database,
  );
}

export async function reorderAlbumResources(orders: { id: string; order: number }[]) {
  for (const item of orders) {
    const resourceId = await resolveMusicResourceId(item.id, "album");
    if (!resourceId) continue;
    const current = await getStudioResource(resourceId);
    if (!current || current.type !== "album") continue;
    const [side] = await db
      .select({
        artist: resourceAlbums.artist,
        color: resourceAlbums.color,
        releaseDate: resourceAlbums.releaseDate,
        cover: assets.url,
        coverAssetId: resources.coverAssetId,
      })
      .from(resourceAlbums)
      .innerJoin(resources, eq(resources.id, resourceAlbums.resourceId))
      .leftJoin(assets, eq(assets.id, resources.coverAssetId))
      .where(eq(resourceAlbums.resourceId, resourceId))
      .limit(1);
    if (!side) continue;
    const snapshot = albumMutableFieldsFromRevision(current.metadataJson, {
      artist: side.artist,
      color: side.color,
      cover: side.cover,
      order: item.order,
      releaseDate: side.releaseDate,
    });
    const nextSnapshot = { ...snapshot, order: item.order };
    const revision = await saveResourceRevision(resourceId, {
      expectedCurrentRevisionId: current.revisionId,
      title: current.title,
      slug: current.slug,
      path: current.path,
      description: current.description,
      visibility: current.visibility,
      content: current.content,
      contentFormat: current.contentFormat,
      metadata: {
        ...parseMusicRevisionMetadata(current.metadataJson),
        ...albumRevisionMetadata(nextSnapshot),
      },
      changeSummary: "Reordered in Studio",
    });
    const additionalStatements = albumFieldStatements({
      resourceId,
      artist: nextSnapshot.artist,
      color: nextSnapshot.color,
      releaseDate: nextSnapshot.releaseDate,
      order: nextSnapshot.order,
      coverAssetId: side.coverAssetId,
    });
    await commitAlbumProjection({
      resourceId,
      expectedRevisionId: revision.revisionId,
      additionalStatements,
    });
  }
}

export async function createTrackResource(input: TrackMutationInput) {
  const parsed = trackInputSchema.parse(input);
  const albumResourceId = await resolveMusicResourceId(parsed.albumId, "album");
  if (!albumResourceId) throw new Error(`Album ${parsed.albumId} was not found.`);
  const album = await getStudioResource(albumResourceId);
  if (!album) throw new Error(`Album ${parsed.albumId} was not found.`);
  const [position] = await db.select({ value: max(tracks.trackNumber) }).from(tracks).where(eq(tracks.albumResourceId, albumResourceId));
  const trackFields = await normalizedTrackFields({
    albumResourceId,
    duration: parsed.duration ?? null,
    durationSeconds: parsed.durationSeconds ?? null,
    url: parsed.url || null,
    externalUrl: parsed.externalUrl || null,
    sourceType: parsed.sourceType,
    trackNumber: parsed.trackNumber ?? (position?.value ?? 0) + 1,
    lyrics: parsed.lyrics ?? null,
  });
  const resourceId = crypto.randomUUID();
  const created = await createResource({
    type: "track",
    title: parsed.name,
    slug: resourceId,
    path: `/music/tracks/${resourceId}`,
    description: null,
    visibility: "public",
    content: parsed.lyrics ?? "",
    contentFormat: "text",
    metadata: trackRevisionMetadata(trackFields),
    authorId: parsed.actorId,
    changeSummary: "Created in Studio",
  });
  const relationStatement = db.insert(tracks).values({
    resourceId: created.id,
    albumResourceId: trackFields.albumResourceId,
    audioAssetId: trackFields.audioAssetId,
    externalUrl: trackFields.externalUrl,
    sourceType: trackFields.sourceType,
    duration: trackFields.duration,
    durationSeconds: trackFields.durationSeconds,
    trackNumber: trackFields.trackNumber,
    lyrics: trackFields.lyrics,
  });
  try {
    await attachNewTrackToAlbum({
      albumResourceId,
      trackResourceId: created.id,
      trackRevisionId: created.revisionId,
      actorId: parsed.actorId,
      relationStatement,
    });
  } catch (error) {
    // The resource bundle is created before its album relation. Compensate a
    // permanent relation/state failure so Studio never accumulates live orphan
    // tracks after an album is archived concurrently.
    await archiveResourceIds([created.id], parsed.actorId).catch(() => undefined);
    throw error;
  }
  return created;
}

export async function updateTrackResource(id: string, input: Omit<TrackMutationInput, "albumId"> & { albumId?: string }) {
  const resourceId = await resolveMusicResourceId(id, "track");
  if (!resourceId) throw new Error(`Track ${id} was not found.`);
  const current = await getStudioResource(resourceId);
  if (!current || current.type !== "track") throw new Error(`Track ${id} was not found.`);
  const [existing] = await db.select().from(tracks).where(eq(tracks.resourceId, resourceId)).limit(1);
  if (!existing) throw new Error(`Track ${id} was not found.`);
  const parsed = trackInputSchema.parse({ ...input, albumId: input.albumId ?? existing.albumResourceId });
  const trackFields = await normalizedTrackFields({
    // Moving a track between albums is a separate relation mutation. Keeping
    // the relation stable here prevents an edit from rewriting which public
    // album owns an older published track snapshot.
    albumResourceId: existing.albumResourceId,
    duration: parsed.duration ?? null,
    durationSeconds: parsed.durationSeconds ?? null,
    url: parsed.url || null,
    externalUrl: parsed.externalUrl || null,
    sourceType: parsed.sourceType,
    trackNumber: parsed.trackNumber ?? existing.trackNumber,
    lyrics: parsed.lyrics ?? null,
  });
  const revision = await saveResourceRevision(resourceId, {
    expectedCurrentRevisionId: current.revisionId,
    title: parsed.name,
    content: parsed.lyrics ?? "",
    contentFormat: "text",
    description: null,
    metadata: {
      ...parseMusicRevisionMetadata(current.metadataJson),
      ...trackRevisionMetadata(trackFields),
    },
    changeSummary: "Updated in Studio",
    actorId: parsed.actorId,
  });
  const sideStatement = trackFieldStatement(resourceId, trackFields);
  await commitTrackProjection({
    resourceId,
    expectedRevisionId: revision.revisionId,
    actorId: parsed.actorId,
    additionalStatements: [sideStatement],
  });
  return { id: resourceId };
}

export async function archiveTrackResource(id: string) {
  const resourceId = await resolveMusicResourceId(id, "track");
  return resourceId ? archiveResourceIds([resourceId]) : 0;
}

export async function reorderTrackResources(orders: { id: string; trackNumber: number }[]) {
  for (const item of orders) {
    const resourceId = await resolveMusicResourceId(item.id, "track");
    if (!resourceId) continue;
    const current = await getStudioResource(resourceId);
    if (!current || current.type !== "track") continue;
    const [side] = await db
      .select({
        albumResourceId: tracks.albumResourceId,
        audioAssetId: tracks.audioAssetId,
        duration: tracks.duration,
        durationSeconds: tracks.durationSeconds,
        externalUrl: tracks.externalUrl,
        sourceType: tracks.sourceType,
        trackNumber: tracks.trackNumber,
        lyrics: tracks.lyrics,
        url: assets.url,
      })
      .from(tracks)
      .leftJoin(assets, eq(assets.id, tracks.audioAssetId))
      .where(eq(tracks.resourceId, resourceId))
      .limit(1);
    if (!side) continue;
    const snapshot = trackMutableFieldsFromRevision(current.metadataJson, {
      duration: side.duration,
      durationSeconds: side.durationSeconds,
      url: side.url,
      externalUrl: side.externalUrl,
      sourceType: side.sourceType,
      trackNumber: side.trackNumber,
    });
    const trackFields: NormalizedTrackFields = {
      ...snapshot,
      albumResourceId: side.albumResourceId,
      audioAssetId: side.audioAssetId,
      trackNumber: item.trackNumber,
      lyrics: current.content,
    };
    const revision = await saveResourceRevision(resourceId, {
      expectedCurrentRevisionId: current.revisionId,
      title: current.title,
      slug: current.slug,
      path: current.path,
      description: current.description,
      visibility: current.visibility,
      content: current.content,
      contentFormat: current.contentFormat,
      metadata: {
        ...parseMusicRevisionMetadata(current.metadataJson),
        ...trackRevisionMetadata(trackFields),
      },
      changeSummary: "Reordered in Studio",
    });
    const sideStatement = trackFieldStatement(resourceId, trackFields);
    await commitTrackProjection({
      resourceId,
      expectedRevisionId: revision.revisionId,
      additionalStatements: [sideStatement],
    });
  }
}
