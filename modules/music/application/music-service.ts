import { and, eq, inArray, max } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { assets, resourceAlbums, resources, tracks } from "@/lib/db/schema";
import {
  archiveResourceIds,
  createResource,
  publishResource,
  saveResourceRevision,
  unpublishResource,
} from "@/modules/resources/application/commands";
import { getStudioResource } from "@/modules/resources/application/queries";
import { resourceSlug } from "@/modules/resources/domain/slug";
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

async function setAlbumFields(input: {
  resourceId: string;
  artist: string;
  color: string | null;
  releaseDate: Date | null;
  order: number;
  coverAssetId: string | null;
}) {
  await db.batch([
    db
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
    db
      .update(resources)
      .set({ coverAssetId: input.coverAssetId, updatedAt: new Date() })
      .where(eq(resources.id, input.resourceId)),
  ] as const);
}

export async function createAlbumResource(input: AlbumMutationInput) {
  const parsed = albumInputSchema.parse(input);
  const slug = musicSlug(parsed.slug || parsed.name);
  if (!slug) throw new Error("Album slug is empty after normalization.");
  const cover = parsed.cover || null;
  const coverAssetId = await findAssetId(cover);
  const created = await createResource({
    type: "album",
    title: parsed.name,
    slug,
    path: `/music/albums/${slug}`,
    description: parsed.description ?? null,
    visibility: "public",
    content: parsed.description ?? "",
    contentFormat: "markdown",
    metadata: { cover, artist: parsed.artist, color: parsed.color ?? "#1a1a2e" },
    authorId: parsed.actorId,
    changeSummary: "Created in Studio",
  });
  await setAlbumFields({
    resourceId: created.id,
    artist: parsed.artist,
    color: parsed.color ?? "#1a1a2e",
    releaseDate: parsed.releaseDate ?? null,
    order: parsed.order,
    coverAssetId,
  });
  if (parsed.published) {
    await publishResource(created.id, parsed.actorId, parsed.releaseDate ?? undefined);
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
  await saveResourceRevision(resourceId, {
    title: parsed.name,
    slug,
    path: `/music/albums/${slug}`,
    description: parsed.description ?? null,
    visibility: "public",
    content: parsed.description ?? "",
    contentFormat: "markdown",
    metadata: { cover, artist: parsed.artist, color: parsed.color ?? "#1a1a2e" },
    changeSummary: "Updated in Studio",
    actorId: parsed.actorId,
  });
  await setAlbumFields({
    resourceId,
    artist: parsed.artist,
    color: parsed.color ?? "#1a1a2e",
    releaseDate: parsed.releaseDate ?? null,
    order: parsed.order,
    coverAssetId: await findAssetId(cover),
  });
  if (parsed.published) await setAlbumPublished(resourceId, true);
  else if (current.status === "published") await setAlbumPublished(resourceId, false);
  return { id: resourceId };
}

export async function setAlbumPublished(id: string, published?: boolean) {
  const resourceId = await resolveMusicResourceId(id, "album");
  if (!resourceId) throw new Error(`Album ${id} was not found.`);
  const current = await getStudioResource(resourceId);
  if (!current) throw new Error(`Album ${id} was not found.`);
  const shouldPublish = published ?? current.status !== "published";
  const albumTrackRows = await db
    .select({ id: tracks.resourceId })
    .from(tracks)
    .where(eq(tracks.albumResourceId, resourceId));
  if (shouldPublish) {
    await publishResource(resourceId);
    for (const track of albumTrackRows) await publishResource(track.id);
  } else {
    await unpublishResource(resourceId);
    for (const track of albumTrackRows) await unpublishResource(track.id);
  }
  return shouldPublish;
}

export async function archiveAlbumResource(id: string) {
  const resourceId = await resolveMusicResourceId(id, "album");
  if (!resourceId) return 0;
  const albumTrackRows = await db
    .select({ id: tracks.resourceId })
    .from(tracks)
    .where(eq(tracks.albumResourceId, resourceId));
  return archiveResourceIds([resourceId, ...albumTrackRows.map((track) => track.id)]);
}

export async function reorderAlbumResources(orders: { id: string; order: number }[]) {
  for (const item of orders) {
    const resourceId = await resolveMusicResourceId(item.id, "album");
    if (resourceId) {
      await db.update(resourceAlbums).set({ sortOrder: item.order }).where(eq(resourceAlbums.resourceId, resourceId));
    }
  }
}

export async function createTrackResource(input: TrackMutationInput) {
  const parsed = trackInputSchema.parse(input);
  const albumResourceId = await resolveMusicResourceId(parsed.albumId, "album");
  if (!albumResourceId) throw new Error(`Album ${parsed.albumId} was not found.`);
  const album = await getStudioResource(albumResourceId);
  if (!album) throw new Error(`Album ${parsed.albumId} was not found.`);
  const [position] = await db.select({ value: max(tracks.trackNumber) }).from(tracks).where(eq(tracks.albumResourceId, albumResourceId));
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
    metadata: { duration: parsed.duration ?? null },
    authorId: parsed.actorId,
    changeSummary: "Created in Studio",
  });
  const uploadUrl = parsed.url || null;
  const audioAssetId = parsed.sourceType === "upload" ? await findAssetId(uploadUrl) : null;
  await db.insert(tracks).values({
    resourceId: created.id,
    albumResourceId,
    audioAssetId,
    externalUrl: parsed.sourceType === "external" ? parsed.externalUrl || null : audioAssetId ? null : uploadUrl,
    sourceType: parsed.sourceType === "upload" && audioAssetId ? "upload" : "external",
    duration: parsed.duration ?? null,
    durationSeconds: parsed.durationSeconds ?? null,
    trackNumber: parsed.trackNumber ?? (position?.value ?? 0) + 1,
    lyrics: parsed.lyrics ?? null,
  });
  if (album.status === "published") await publishResource(created.id, parsed.actorId);
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
  const uploadUrl = parsed.url || null;
  const audioAssetId = parsed.sourceType === "upload" ? await findAssetId(uploadUrl) : null;
  await saveResourceRevision(resourceId, {
    title: parsed.name,
    content: parsed.lyrics ?? "",
    contentFormat: "text",
    description: null,
    metadata: { duration: parsed.duration ?? null },
    changeSummary: "Updated in Studio",
    actorId: parsed.actorId,
  });
  await db.update(tracks).set({
    audioAssetId,
    externalUrl: parsed.sourceType === "external" ? parsed.externalUrl || null : audioAssetId ? null : uploadUrl,
    sourceType: parsed.sourceType === "upload" && audioAssetId ? "upload" : "external",
    duration: parsed.duration ?? null,
    durationSeconds: parsed.durationSeconds ?? null,
    trackNumber: parsed.trackNumber ?? existing.trackNumber,
    lyrics: parsed.lyrics ?? null,
  }).where(eq(tracks.resourceId, resourceId));
  if (current.status === "published") await publishResource(resourceId, parsed.actorId);
  return { id: resourceId };
}

export async function archiveTrackResource(id: string) {
  const resourceId = await resolveMusicResourceId(id, "track");
  return resourceId ? archiveResourceIds([resourceId]) : 0;
}

export async function reorderTrackResources(orders: { id: string; trackNumber: number }[]) {
  for (const item of orders) {
    const resourceId = await resolveMusicResourceId(item.id, "track");
    if (resourceId) await db.update(tracks).set({ trackNumber: item.trackNumber }).where(eq(tracks.resourceId, resourceId));
  }
}
