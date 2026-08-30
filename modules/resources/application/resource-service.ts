import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { assets, collections, documents, resourceAssets, resources } from "@/lib/db/schema";

import {
  archiveResourceIds,
  createResource,
  publishResource,
  saveResourceRevision,
  scheduleResource,
  unpublishResource,
} from "@/modules/resources/application/commands";
import { getStudioResource } from "@/modules/resources/application/queries";
import {
  contentFormats,
  resourceTypes,
  resourceVisibilities,
} from "@/modules/resources/domain/types";
import { resourceSlug } from "@/modules/resources/domain/slug";

const genericResourceSchema = z.object({
  type: z.enum(resourceTypes),
  title: z.string().trim().min(1).max(300),
  slug: z.string().trim().max(500).optional(),
  path: z.string().trim().max(1_500).optional(),
  description: z.string().max(4_000).nullable().optional(),
  visibility: z.enum(resourceVisibilities).default("public"),
  content: z.string().default(""),
  contentFormat: z.enum(contentFormats).default("markdown"),
  metadata: z.record(z.string(), z.unknown()).default({}),
  published: z.boolean().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  authorId: z.string().nullable().optional(),
  changeSummary: z.string().max(500).nullable().optional(),
}).refine((value) => !value.scheduledAt || value.scheduledAt > new Date(), {
  message: "Scheduled publication time must be in the future.",
  path: ["scheduledAt"],
});

export type GenericResourceInput = z.input<typeof genericResourceSchema>;

const dedicatedResourceTypes = new Set<(typeof resourceTypes)[number]>([
  "article",
  "album",
  "track",
]);

export function assertGenericResourceType(
  type: (typeof resourceTypes)[number],
) {
  if (dedicatedResourceTypes.has(type)) {
    throw new Error(`Use the dedicated ${type} editor for this resource type.`);
  }
}

const sectionByType: Record<(typeof resourceTypes)[number], string> = {
  article: "/blog",
  document: "/docs",
  photo: "/photos",
  album: "/music/albums",
  track: "/music/tracks",
  podcast: "/knowledge",
  course: "/docs/course",
  lesson: "/knowledge",
  tool: "/tools",
  project: "/projects",
  short: "/shorts",
  download: "/docs/download",
  collection: "/knowledge",
};

export const genericSlug = resourceSlug;

function resourcePath(
  type: (typeof resourceTypes)[number],
  slug: string,
  path?: string
) {
  return path || `${sectionByType[type]}/${slug}`;
}

async function setGenericExtension(
  resourceId: string,
  type: (typeof resourceTypes)[number],
  metadata: Record<string, unknown>
) {
  if (type === "photo") {
    const assetId = typeof metadata.assetId === "string" ? metadata.assetId : "";
    if (!assetId) throw new Error("Photo resources require metadata.assetId.");
    const [asset] = await db
      .select({ id: assets.id, mimeType: assets.mimeType })
      .from(assets)
      .where(eq(assets.id, assetId))
      .limit(1);
    if (!asset) throw new Error(`Asset ${assetId} was not found.`);
    if (!asset.mimeType?.startsWith("image/")) throw new Error("Photo resources require an image Asset.");
    await db.batch([
      db.update(resources).set({ coverAssetId: asset.id }).where(eq(resources.id, resourceId)),
      db.delete(resourceAssets).where(and(
        eq(resourceAssets.resourceId, resourceId),
        eq(resourceAssets.role, "cover")
      )),
      db.insert(resourceAssets).values({
        resourceId,
        assetId: asset.id,
        role: "cover",
        sortOrder: 0,
      }),
    ] as const);
  }
  if (type === "document") {
    const sourceType = ["git", "remote", "upload", "manual"].includes(String(metadata.sourceType))
      ? metadata.sourceType as "git" | "remote" | "upload" | "manual"
      : "manual";
    await db.insert(documents).values({
      resourceId,
      sourceType,
      repository: typeof metadata.repository === "string" ? metadata.repository : null,
      sourcePath: typeof metadata.sourcePath === "string" ? metadata.sourcePath : null,
      commit: typeof metadata.commit === "string" ? metadata.commit : null,
    }).onConflictDoUpdate({
      target: documents.resourceId,
      set: {
        sourceType,
        repository: typeof metadata.repository === "string" ? metadata.repository : null,
        sourcePath: typeof metadata.sourcePath === "string" ? metadata.sourcePath : null,
        commit: typeof metadata.commit === "string" ? metadata.commit : null,
      },
    });
  }
  if (type === "collection") {
    const layout = ["list", "grid", "chapters", "timeline"].includes(String(metadata.layout))
      ? metadata.layout as "list" | "grid" | "chapters" | "timeline"
      : "list";
    await db.insert(collections).values({ resourceId, layout }).onConflictDoUpdate({
      target: collections.resourceId,
      set: { layout },
    });
  }
}

export async function createGenericResource(input: GenericResourceInput) {
  const parsed = genericResourceSchema.parse(input);
  assertGenericResourceType(parsed.type);
  const slug = genericSlug(parsed.slug || parsed.title);
  if (!slug) throw new Error("Resource slug is empty after normalization.");
  const created = await createResource({
    type: parsed.type,
    title: parsed.title,
    slug,
    path: resourcePath(parsed.type, slug, parsed.path),
    description: parsed.description ?? null,
    visibility: parsed.visibility,
    content: parsed.content,
    contentFormat: parsed.contentFormat,
    metadata: parsed.metadata,
    authorId: parsed.authorId,
    changeSummary: parsed.changeSummary ?? "Created in Studio",
  });
  try {
    await setGenericExtension(created.id, parsed.type, parsed.metadata);
  } catch (error) {
    await archiveResourceIds([created.id], parsed.authorId);
    throw error;
  }
  if (parsed.scheduledAt && parsed.scheduledAt > new Date()) {
    await scheduleResource(created.id, parsed.scheduledAt, parsed.authorId, {
      expectedCurrentRevisionId: created.revisionId,
    });
  } else if (parsed.published) {
    await publishResource(created.id, parsed.authorId, parsed.publishedAt ?? undefined, {
      expectedCurrentRevisionId: created.revisionId,
    });
  }
  return created;
}

export async function updateGenericResource(id: string, input: GenericResourceInput) {
  const current = await getStudioResource(id);
  if (!current) throw new Error(`Resource ${id} was not found.`);
  const parsed = genericResourceSchema.parse(input);
  if (parsed.type !== current.type) throw new Error("Resource type cannot be changed.");
  assertGenericResourceType(current.type);
  const slug = genericSlug(parsed.slug || parsed.title);
  if (!slug) throw new Error("Resource slug is empty after normalization.");
  const revision = await saveResourceRevision(id, {
    expectedCurrentRevisionId: current.revisionId,
    title: parsed.title,
    slug,
    path: resourcePath(parsed.type, slug, parsed.path),
    description: parsed.description ?? null,
    visibility: parsed.visibility,
    content: parsed.content,
    contentFormat: parsed.contentFormat,
    metadata: parsed.metadata,
    changeSummary: parsed.changeSummary ?? "Updated in Studio",
    actorId: parsed.authorId,
  });
  await setGenericExtension(id, parsed.type, parsed.metadata);
  if (parsed.scheduledAt && parsed.scheduledAt > new Date()) {
    await scheduleResource(id, parsed.scheduledAt, parsed.authorId, {
      expectedCurrentRevisionId: revision.revisionId,
    });
  } else if (parsed.published === true) {
    await publishResource(id, parsed.authorId, parsed.publishedAt ?? undefined, {
      expectedCurrentRevisionId: revision.revisionId,
    });
  }
  if (parsed.published === false && !parsed.scheduledAt && (current.status === "published" || current.status === "scheduled")) {
    await unpublishResource(id, parsed.authorId);
  }
  return revision;
}

export async function archiveGenericResource(id: string, actorId?: string | null) {
  const current = await getStudioResource(id);
  if (!current) throw new Error(`Resource ${id} was not found.`);
  assertGenericResourceType(current.type);
  return archiveResourceIds([id], actorId);
}
