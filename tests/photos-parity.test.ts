import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  dynamic,
} from "../app/(site)/photos/[file]/route";
import {
  photoCollectionHash,
  photoCollectionFromResources,
  photoCollectionResponse,
  photoItemsFromResources,
} from "../lib/parity/photo-resources";
import {
  ASTRO_PHOTO_ENDPOINT_FILE,
  ASTRO_PHOTO_HASH,
  astroPhotoItems,
  calculateMasonryLayout,
} from "../lib/parity/photos";
import { getPublicContentSnapshot } from "../lib/parity/public-content-snapshot";
import { ASTRO_PUBLIC_CONTENT_BASELINE_REVISION } from "../lib/parity/public-content-snapshot-types";
import type { PublishedResource } from "../modules/resources/infrastructure/resource-repository";

function photoResource(photo: typeof astroPhotoItems[number], order: number): PublishedResource {
  return {
    id: `photo:${photo.uuid}`,
    type: "photo",
    title: photo.desc,
    slug: photo.uuid,
    path: `/photos/${photo.uuid}`,
    description: null,
    visibility: "public",
    coverAssetId: null,
    publishedAt: new Date(1_700_000_000_000 + order),
    revisionId: `revision:${photo.uuid}`,
    version: 1,
    content: "",
    contentFormat: "json",
    metadataJson: JSON.stringify({ url: photo.src }),
  };
}

test("restores the exact 132f41f4 production photo tuple in order", () => {
  assert.equal(astroPhotoItems.length, 16);
  assert.equal(
    astroPhotoItems[0].src,
    "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/music/covers/1765893555987-david-tao.png",
  );
  assert.equal(astroPhotoItems[0].desc, "1765893555987-david-tao");
  assert.equal(
    astroPhotoItems.at(-1)?.src,
    "https://pub-563a1d32732a43a4ba208b4eff1536ac.r2.dev/uploads/1782139100853-2d678429be6e4a6d80083249cd03b103~tplv-dy-aweme-images_q75.webp",
  );
  assert.equal(
    astroPhotoItems.at(-1)?.desc,
    "1782139100853-2d678429be6e4a6d80083249cd03b103~tplv-dy-aweme-images_q75",
  );

  const uuids = new Set(astroPhotoItems.map((photo) => photo.uuid));
  assert.equal(uuids.size, 16);
  assert.ok(astroPhotoItems.every((photo) => photo.thumbnail === photo.src));
  assert.ok(astroPhotoItems.every((photo) => photo.placeholder.startsWith("data:image/webp;base64,")));
  assert.ok(astroPhotoItems.every((photo) => photo.aspectRatio > 0));

  const sourceConfig = astroPhotoItems.map((photo) => ({ id: photo.src, desc: photo.desc }));
  const sourceHash = createHash("sha256")
    .update(`1-${JSON.stringify(sourceConfig)}`)
    .digest("hex")
    .slice(0, 8);
  assert.equal(sourceHash, "132f41f4");
  assert.equal(ASTRO_PHOTO_HASH, sourceHash);

  const metadataHash = createHash("sha256")
    .update(JSON.stringify(astroPhotoItems))
    .digest("hex");
  assert.equal(metadataHash, "db857ab5cff7143399995b46f411b7e02b0f2d7db7101aec7f6a49c2394f2d3c");

  const bodyHash = createHash("sha256")
    .update(JSON.stringify([ASTRO_PHOTO_HASH, astroPhotoItems]))
    .digest("hex");
  assert.equal(bodyHash, "b135af0465c18bb5ebdd5dc8b58689b7172b27cc75667b62dd58585cf116d8db");
});

test("serves the D1-driven content-addressed photo tuple with immutable production caching", async () => {
  assert.equal(dynamic, "force-dynamic");
  assert.equal(ASTRO_PHOTO_ENDPOINT_FILE, "photos.132f41f4.json");

  const resources = astroPhotoItems.map(photoResource).reverse();
  const collection = await photoCollectionFromResources(resources);
  assert.equal(collection.hash, ASTRO_PHOTO_HASH);
  assert.deepEqual(collection.items, astroPhotoItems);

  const response = photoCollectionResponse(ASTRO_PHOTO_ENDPOINT_FILE, collection);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json");
  assert.equal(
    response.headers.get("cache-control"),
    process.env.NODE_ENV === "development"
      ? "no-store"
      : "public, max-age=31536000, immutable"
  );

  const payload = await response.json() as [string, typeof astroPhotoItems];
  assert.equal(payload[0], ASTRO_PHOTO_HASH);
  assert.deepEqual(payload[1], astroPhotoItems);

  const missing = photoCollectionResponse("photos.not-current.json", collection);
  assert.equal(missing.status, 404);

  const withoutFirst = photoItemsFromResources(resources.filter((resource) => resource.metadataJson !== JSON.stringify({ url: astroPhotoItems[0].src })));
  assert.equal(withoutFirst.some((photo) => photo.src === astroPhotoItems[0].src), false);
  assert.equal(withoutFirst.length, 15);
});

test("changes the immutable photo URL when any rendered tuple field changes", async () => {
  for (const mutation of [
    { thumbnail: `${astroPhotoItems[0].thumbnail}?v=2` },
    { placeholder: `${astroPhotoItems[0].placeholder}A` },
    { aspectRatio: astroPhotoItems[0].aspectRatio + 0.01 },
    { uuid: `${astroPhotoItems[0].uuid}v2` },
  ]) {
    const changed = astroPhotoItems.map((photo, index) => (
      index === 0 ? { ...photo, ...mutation } : photo
    ));
    assert.notEqual(await photoCollectionHash(changed), ASTRO_PHOTO_HASH);
  }
});

test("prebuilds the complete photo collection and its content-addressed static endpoint", () => {
  const snapshot = getPublicContentSnapshot();
  assert.equal(snapshot.photos.length, snapshot.counts.photos);
  assert.equal(snapshot.photoCollection.file, `photos.${snapshot.photoCollection.hash}.json`);
  assert.equal(snapshot.contentRevision, ASTRO_PUBLIC_CONTENT_BASELINE_REVISION);
  assert.equal(snapshot.photos.length, 16);
  assert.deepEqual(snapshot.photoCollection, {
    hash: ASTRO_PHOTO_HASH,
    file: ASTRO_PHOTO_ENDPOINT_FILE,
  });

  const page = readFileSync(path.join(process.cwd(), "app/(site)/photos/page.tsx"), "utf8");
  assert.match(page, /dynamic = "force-static"/);
  assert.match(page, /getPublicContentSnapshot\(\)\.photoCollection/);
  assert.doesNotMatch(page, /getPublishedResources|collectAllPages|force-dynamic/);

  const endpoint = readFileSync(
    path.join(process.cwd(), "public/photos", snapshot.photoCollection.file),
    "utf8",
  );
  const payload = JSON.parse(endpoint) as [string, typeof astroPhotoItems];
  assert.equal(payload[0], snapshot.photoCollection.hash);
  assert.equal(payload[1].length, snapshot.photos.length);
  assert.deepEqual(payload, [ASTRO_PHOTO_HASH, astroPhotoItems]);
});

test("calculates the exact five-column desktop and one-column mobile masonry geometry", () => {
  const desktop = calculateMasonryLayout(astroPhotoItems.slice(0, 15), 1224, {
    gap: 16,
    minPhotoWidth: 240,
    maxPhotoWidth: 1000,
    strategy: "sequential",
  });
  assert.equal(desktop.columns, 5);
  assert.equal(desktop.columnWidth, 232);
  assert.deepEqual(
    desktop.positions.slice(0, 5).map(({ column, left, top }) => ({ column, left, top })),
    [
      { column: 0, left: 0, top: 0 },
      { column: 1, left: 248, top: 0 },
      { column: 2, left: 496, top: 0 },
      { column: 3, left: 744, top: 0 },
      { column: 4, left: 992, top: 0 },
    ]
  );
  assert.equal(desktop.positions[5].column, 0);
  assert.equal(desktop.positions[5].top, desktop.positions[0].height + 16);

  const mobile = calculateMasonryLayout(astroPhotoItems, 326, {
    gap: 16,
    minPhotoWidth: 240,
  });
  assert.equal(mobile.columns, 1);
  assert.equal(mobile.columnWidth, 326);
  assert.ok(mobile.positions.every((position) => position.column === 0 && position.left === 0));
  assert.equal(mobile.positions[1].top, mobile.positions[0].height + 16);
});

test("supports both sequential and shortest-column balanced masonry", () => {
  const photos = [
    { aspectRatio: 1 },
    { aspectRatio: 4 },
    { aspectRatio: 1 },
    { aspectRatio: 1 },
    { aspectRatio: 1 },
  ];
  const sequential = calculateMasonryLayout(photos, 496, { strategy: "sequential" });
  const balanced = calculateMasonryLayout(photos, 496, { strategy: "balanced" });

  assert.deepEqual(sequential.positions.map((position) => position.column), [0, 1, 0, 1, 0]);
  assert.deepEqual(balanced.positions.map((position) => position.column), [0, 1, 1, 0, 1]);
  assert.ok(balanced.height < sequential.height);
});

test("keeps batch loading, persisted layout, ResizeObserver and ViewerJS focus restoration", () => {
  const root = process.cwd();
  const gallery = readFileSync(path.join(root, "components/site/photo-gallery.tsx"), "utf8");
  const viewerBoundary = readFileSync(path.join(root, "components/site/photo-image-viewer.tsx"), "utf8");
  const viewer = readFileSync(path.join(root, "components/site/photo-image-viewer-impl.tsx"), "utf8");
  const css = readFileSync(path.join(root, "app/photos-parity.css"), "utf8");

  assert.match(gallery, /batchSize = 15/);
  assert.match(gallery, /PHOTO_LAYOUT_STORAGE_KEY/);
  assert.match(gallery, /function readStoredLayout\(\)/);
  assert.match(gallery, /function storeLayout\(layout: PhotoLayout\)/);
  assert.match(gallery, /try \{[\s\S]*window\.localStorage\.getItem/);
  assert.match(gallery, /try \{[\s\S]*window\.localStorage\.setItem/);
  assert.match(gallery, /new ResizeObserver/);
  assert.match(gallery, /window\.innerHeight \* 0\.6/);
  assert.match(gallery, /data-origin=\{item\.src\}/);
  assert.match(viewer, /import\("viewerjs"\)/);
  assert.match(viewer, /new MutationObserver/);
  assert.match(viewer, /requestAnimationFrame\(\(\) => \(parent as HTMLElement\)\.focus\(\)\)/);
  assert.match(viewerBoundary, /dynamic\(/);
  assert.match(viewerBoundary, /ssr:\s*false/);
  assert.match(viewerBoundary, /photo-image-viewer-impl/);
  assert.doesNotMatch(viewerBoundary, /import\("viewerjs"\)/);
  assert.match(css, /margin:\s*1\.25rem 5rem 0/);
  assert.match(css, /position:\s*absolute/);
  assert.match(css, /max-width:\s*1127px/);
  assert.match(css, /max-width:\s*767px/);
});
