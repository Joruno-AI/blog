import {
  ASTRO_PHOTO_HASH,
  astroPhotoItems,
  type PhotoItem,
} from "@/lib/parity/photos";
import type { PublishedResource } from "@/modules/resources/infrastructure/resource-repository";

const EMPTY_PLACEHOLDER = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/vuUAAA=";
const snapshotByUrl = new Map<string, PhotoItem & { order: number }>(
  astroPhotoItems.map((photo, order) => [photo.src, { ...photo, order }]),
);

type PhotoMetadata = {
  url?: unknown;
  thumbnail?: unknown;
  desc?: unknown;
  originalName?: unknown;
  placeholder?: unknown;
  aspectRatio?: unknown;
  width?: unknown;
  height?: unknown;
  uuid?: unknown;
  order?: unknown;
};

function metadata(resource: PublishedResource): PhotoMetadata {
  try {
    const value: unknown = JSON.parse(resource.metadataJson);
    return value && typeof value === "object" && !Array.isArray(value) ? value as PhotoMetadata : {};
  } catch {
    return {};
  }
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function positiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function fallbackUuid(resource: PublishedResource) {
  return resource.id.replace(/^photo:/, "").replace(/[^A-Za-z0-9]/g, "").slice(0, 12) || resource.slug;
}

function fallbackDescription(resource: PublishedResource, meta: PhotoMetadata, url: string) {
  const named = text(meta.desc) || text(meta.originalName) || url.split("/").pop() || resource.title;
  return named.replace(/\.[A-Za-z\d]{2,5}$/i, "");
}

/**
 * The published D1 set is authoritative. The frozen tuple only supplies
 * presentation metadata for migrated rows that predate those CMS fields; it
 * never adds a missing/deleted resource back into the collection.
 */
export function photoItemsFromResources(resources: readonly PublishedResource[]): PhotoItem[] {
  return resources.flatMap((resource) => {
    const meta = metadata(resource);
    const url = text(meta.url);
    if (!url) return [];
    const snapshot = snapshotByUrl.get(url);
    const width = positiveNumber(meta.width);
    const height = positiveNumber(meta.height);
    const explicitOrder = typeof meta.order === "number" && Number.isFinite(meta.order) ? meta.order : null;
    return [{
      item: {
        uuid: text(meta.uuid) || snapshot?.uuid || fallbackUuid(resource),
        src: url,
        desc: text(meta.desc) || snapshot?.desc || fallbackDescription(resource, meta, url),
        thumbnail: text(meta.thumbnail) || snapshot?.thumbnail || url,
        placeholder: text(meta.placeholder) || snapshot?.placeholder || EMPTY_PLACEHOLDER,
        aspectRatio: positiveNumber(meta.aspectRatio) || (width && height ? width / height : 0) || snapshot?.aspectRatio || 1,
      },
      order: explicitOrder ?? snapshot?.order ?? Number.POSITIVE_INFINITY,
      publishedAt: resource.publishedAt?.valueOf() ?? Number.POSITIVE_INFINITY,
    }];
  }).sort((left, right) => {
    if (left.order !== right.order) return left.order < right.order ? -1 : 1;
    if (left.publishedAt !== right.publishedAt) return left.publishedAt - right.publishedAt;
    return left.item.uuid.localeCompare(right.item.uuid, "en", { numeric: true });
  }).map(({ item }) => item);
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function canonicalPhotoTuple(items: readonly PhotoItem[]) {
  return items.map(({ uuid, src, desc, thumbnail, placeholder, aspectRatio }) => ({
    uuid,
    src,
    desc,
    thumbnail,
    placeholder,
    aspectRatio,
  }));
}

export function photoCollectionHashInput(items: readonly PhotoItem[]) {
  const canonical = canonicalPhotoTuple(items);
  if (JSON.stringify(canonical) === JSON.stringify(canonicalPhotoTuple(astroPhotoItems))) {
    return null;
  }
  return `2-${JSON.stringify(canonical)}`;
}

export async function photoCollectionHash(items: readonly PhotoItem[]) {
  const input = photoCollectionHashInput(items);
  // Preserve the immutable production URL only for the exact production
  // tuple. Any presentation-field change gets a new full-tuple hash.
  if (input === null) return ASTRO_PHOTO_HASH;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return hex(digest).slice(0, 8);
}

export async function photoCollectionFromResources(resources: readonly PublishedResource[]) {
  const items = photoItemsFromResources(resources);
  const hash = await photoCollectionHash(items);
  return { hash, file: `photos.${hash}.json`, items };
}

export function photoCollectionResponse(
  requestedFile: string,
  collection: { hash: string; file: string; items: readonly PhotoItem[] },
) {
  if (requestedFile !== collection.file) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return new Response(JSON.stringify([collection.hash, collection.items]), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": process.env.NODE_ENV === "development"
        ? "no-store"
        : "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
