import { desc, eq, inArray, like } from "drizzle-orm";

import { db } from "@/lib/db";
import { assets, resourceAssets, resources, tracks } from "@/lib/db/schema";
import { deleteFile, uploadAsset } from "@/lib/r2";

function mediaType(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image" as const;
  if (mimeType.startsWith("audio/")) return "audio" as const;
  if (mimeType.startsWith("video/")) return "video" as const;
  if (/zip|tar|gzip|7z/.test(mimeType)) return "archive" as const;
  if (mimeType.startsWith("text/") || mimeType.startsWith("application/")) return "document" as const;
  return "other" as const;
}

export function assetDto(asset: Pick<
  typeof assets.$inferSelect,
  "id" | "url" | "name" | "mimeType" | "mediaType" | "size" | "createdAt"
>) {
  return {
    id: asset.id,
    url: asset.url,
    name: asset.name,
    type: asset.mimeType ?? asset.mediaType,
    size: asset.size,
    createdAt: asset.createdAt,
  };
}

export async function listAssets(options: {
  limit?: number;
  offset?: number;
  mimePrefix?: string;
} = {}) {
  const { limit = 1_000, offset = 0, mimePrefix } = options;
  return db
    .select()
    .from(assets)
    .where(mimePrefix ? like(assets.mimeType, `${mimePrefix}%`) : undefined)
    .orderBy(desc(assets.createdAt), desc(assets.id))
    .limit(Math.min(Math.max(limit, 1), 1_000))
    .offset(Math.max(offset, 0));
}

export async function createAsset(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const uploaded = await uploadAsset(arrayBuffer, file.name, file.type || "application/octet-stream");
  const now = new Date();
  const asset = {
    id: crypto.randomUUID(),
    key: uploaded.key,
    url: uploaded.url,
    name: file.name,
    mediaType: mediaType(file.type),
    mimeType: file.type || null,
    size: file.size,
    createdAt: now,
    updatedAt: now,
  } satisfies typeof assets.$inferInsert;
  try {
    await db.insert(assets).values(asset);
  } catch (error) {
    await deleteFile(uploaded.key);
    throw error;
  }
  return asset;
}

export async function resolveAssetId(id: string) {
  const candidates = id.startsWith("asset:") ? [id] : [id, `asset:${id}`];
  const [asset] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(inArray(assets.id, candidates))
    .limit(1);
  return asset?.id ?? null;
}

export async function renameAsset(id: string, name: string) {
  const assetId = await resolveAssetId(id);
  if (!assetId) throw new Error(`Asset ${id} was not found.`);
  await db.update(assets).set({ name: name.trim(), updatedAt: new Date() }).where(eq(assets.id, assetId));
  return assetId;
}

export async function deleteAsset(id: string) {
  const assetId = await resolveAssetId(id);
  if (!assetId) throw new Error(`Asset ${id} was not found.`);
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset) throw new Error(`Asset ${id} was not found.`);

  const [coverReference, relationReference, trackReference] = await Promise.all([
    db.select({ id: resources.id }).from(resources).where(eq(resources.coverAssetId, assetId)).limit(1),
    db.select({ id: resourceAssets.resourceId }).from(resourceAssets).where(eq(resourceAssets.assetId, assetId)).limit(1),
    db.select({ id: tracks.resourceId }).from(tracks).where(eq(tracks.audioAssetId, assetId)).limit(1),
  ]);
  if (coverReference[0] || relationReference[0] || trackReference[0]) {
    throw new Error("Asset is still referenced by published or editable content.");
  }

  let storageKey = asset.key;
  if (storageKey.startsWith("legacy-media/")) {
    try {
      storageKey = new URL(asset.url).pathname.replace(/^\/+/, "");
    } catch {
      // Keep the recorded key when the legacy URL is not parseable.
    }
  }
  await deleteFile(storageKey);
  await db.delete(assets).where(eq(assets.id, assetId));
}
