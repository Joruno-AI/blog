import {
  archiveResources,
  findEditableResourceById,
  insertResourceBundle,
  insertRevisionAndSelectIt,
  nextResourceVersion,
  publishCurrentRevision,
  scheduleCurrentRevision,
  synchronizeSearchIndex,
  unpublishResourceRecord,
} from "@/modules/resources/infrastructure/resource-repository";
import {
  assertContentFitsD1,
  resourceDraftSchema,
  revisionDraftSchema,
  type ResourceDraftInput,
  type RevisionDraftInput,
} from "@/modules/resources/domain/types";
import { normalizeResourcePath } from "@/modules/resources/domain/path";

async function hashContent(content: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export async function createResource(input: ResourceDraftInput) {
  const parsed = resourceDraftSchema.parse(input);
  assertContentFitsD1(parsed.content);

  const id = crypto.randomUUID();
  const revisionId = crypto.randomUUID();
  const path = normalizeResourcePath(parsed.path);
  const now = new Date();

  await insertResourceBundle({
    resource: {
      id,
      type: parsed.type,
      title: parsed.title,
      slug: parsed.slug,
      path,
      description: parsed.description,
      visibility: parsed.visibility,
      status: "draft",
      currentRevisionId: revisionId,
      authorId: parsed.authorId,
      createdAt: now,
      updatedAt: now,
    },
    revision: {
      id: revisionId,
      resourceId: id,
      version: 1,
      title: parsed.title,
      slug: parsed.slug,
      path,
      description: parsed.description,
      visibility: parsed.visibility,
      content: parsed.content,
      contentFormat: parsed.contentFormat,
      metadataJson: JSON.stringify(parsed.metadata),
      sourceHash: await hashContent(parsed.content),
      changeSummary: parsed.changeSummary,
      createdBy: parsed.authorId,
      createdAt: now,
    },
    route: {
      path,
      resourceId: id,
      canonical: true,
      createdAt: now,
    },
    event: {
      id: crypto.randomUUID(),
      resourceId: id,
      revisionId,
      eventType: "created",
      actorId: parsed.authorId,
      createdAt: now,
    },
  });

  return { id, revisionId, path };
}

export async function saveResourceRevision(
  resourceId: string,
  input: RevisionDraftInput & {
    actorId?: string | null;
    slug?: string;
    path?: string;
    visibility?: ResourceDraftInput["visibility"];
  }
) {
  const resource = await findEditableResourceById(resourceId);
  if (!resource) throw new Error(`Resource ${resourceId} was not found.`);

  const parsed = revisionDraftSchema.parse(input);
  assertContentFitsD1(parsed.content);

  const version = await nextResourceVersion(resourceId);
  const revisionId = crypto.randomUUID();
  const normalizedPath = input.path
    ? normalizeResourcePath(input.path)
    : undefined;

  await insertRevisionAndSelectIt({
    resourceId,
    revision: {
      id: revisionId,
      resourceId,
      version,
      title: parsed.title,
      slug: input.slug ?? resource.slug,
      path: normalizedPath ?? resource.path,
      description: parsed.description,
      visibility: input.visibility ?? resource.visibility,
      content: parsed.content,
      contentFormat: parsed.contentFormat,
      metadataJson: JSON.stringify(parsed.metadata),
      sourceHash: await hashContent(parsed.content),
      changeSummary: parsed.changeSummary,
      createdBy: input.actorId,
      createdAt: new Date(),
    },
    actorId: input.actorId,
  });

  return { resourceId, revisionId, version };
}

export async function publishResource(
  resourceId: string,
  actorId?: string | null,
  publishedAt?: Date
) {
  const resource = await publishCurrentRevision({ resourceId, actorId, publishedAt });
  if (!resource) throw new Error(`Resource ${resourceId} was not found.`);

  await synchronizeSearchIndex(resourceId);
  return resource;
}

export async function scheduleResource(
  resourceId: string,
  scheduledAt: Date,
  actorId?: string | null
) {
  const resource = await scheduleCurrentRevision({ resourceId, scheduledAt, actorId });
  if (!resource) throw new Error(`Resource ${resourceId} was not found.`);
  return resource;
}

export async function archiveResourceIds(
  resourceIds: string[],
  actorId?: string | null
) {
  return archiveResources(resourceIds, actorId);
}

export async function unpublishResource(
  resourceId: string,
  actorId?: string | null
) {
  const resource = await unpublishResourceRecord(resourceId, actorId);
  if (!resource) throw new Error(`Resource ${resourceId} was not found.`);
  return resource;
}
