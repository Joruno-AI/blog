import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { assets, resourceRevisions, resources } from "@/lib/db/schema";
import { getPublicResource } from "@/modules/resources/application/queries";
import type { ResourceViewer } from "@/modules/resources/domain/access";

export async function getPublicPhoto(path: string, viewer: ResourceViewer = null) {
  const resource = await getPublicResource(path, viewer);
  if (!resource || resource.type !== "photo" || !resource.coverAssetId) return null;
  const [asset] = await db
    .select()
    .from(assets)
    .where(eq(assets.id, resource.coverAssetId))
    .limit(1);
  return asset ? { resource, asset } : null;
}

export async function listPublicPhotos(limit = 60) {
  return db
    .select({
      id: resources.id,
      title: resourceRevisions.title,
      description: resourceRevisions.description,
      path: resourceRevisions.path,
      publishedAt: resources.publishedAt,
      url: assets.url,
      mimeType: assets.mimeType,
      width: assets.width,
      height: assets.height,
    })
    .from(resources)
    .innerJoin(resourceRevisions, eq(resourceRevisions.id, resources.publishedRevisionId))
    .innerJoin(assets, eq(assets.id, resources.coverAssetId))
    .where(and(
      eq(resources.type, "photo"),
      eq(resources.status, "published"),
      eq(resources.visibility, "public")
    ))
    .orderBy(desc(resources.publishedAt), desc(resources.id))
    .limit(Math.min(Math.max(limit, 1), 100));
}
