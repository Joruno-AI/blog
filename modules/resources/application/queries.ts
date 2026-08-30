import { normalizeResourcePath } from "@/modules/resources/domain/path";
import {
  countEditableResources,
  countPublishedResources,
  findEditableResourceById,
  findPublicChangelogResourceBySlug,
  findPublishedResourceByPath,
  findPublishedResourceSummaryByPath,
  findRedirectByPath,
  listEditableResources,
  listPublicResourceRoutes,
  listPublishedResources,
  listPublishedResourceSummaries,
  listPublishedResourceSummariesByPathPrefix,
  listPublishedResourcesByTypes,
  listPublishedResourcesByPathPrefix,
  searchPublishedResources,
  publicSearchCollections,
  type PublicSearchCollection,
} from "@/modules/resources/infrastructure/resource-repository";
import {
  canAccessResource,
  type ResourceViewer,
} from "@/modules/resources/domain/access";
import type { ResourceType } from "@/modules/resources/domain/types";

export async function getPublicResource(
  path: string,
  viewer: ResourceViewer = null
) {
  const resource = await findPublishedResourceByPath(
    normalizeResourcePath(path)
  );
  if (!resource) return null;

  const [resourceAllowed, revisionAllowed] = await Promise.all([
    canAccessResource(viewer, resource),
    canAccessResource(viewer, {
      id: resource.id,
      visibility: resource.revisionVisibility,
    }),
  ]);
  if (!resourceAllowed || !revisionAllowed) return null;

  const { revisionVisibility: _revisionVisibility, ...publicResource } = resource;
  return publicResource;
}

export async function getPublicChangelogResourceBySlug(slug: string) {
  return findPublicChangelogResourceBySlug(slug);
}

export async function getPublicResourceSummary(
  path: string,
  viewer: ResourceViewer = null
) {
  const resource = await findPublishedResourceSummaryByPath(
    normalizeResourcePath(path)
  );
  if (!resource) return null;

  const [resourceAllowed, revisionAllowed] = await Promise.all([
    canAccessResource(viewer, resource),
    canAccessResource(viewer, {
      id: resource.id,
      visibility: resource.revisionVisibility,
    }),
  ]);
  if (!resourceAllowed || !revisionAllowed) return null;

  const { revisionVisibility: _revisionVisibility, ...publicResource } = resource;
  return publicResource;
}

export async function getStudioResource(id: string) {
  return findEditableResourceById(id);
}

export async function getStudioResources(
  options: Parameters<typeof listEditableResources>[0] = {}
) {
  return listEditableResources(options);
}

export async function getStudioResourceCount(
  options: Parameters<typeof countEditableResources>[0] = {}
) {
  return countEditableResources(options);
}

export async function getPublishedResources(options: {
  type?: ResourceType;
  limit?: number;
  offset?: number;
} = {}) {
  return listPublishedResources(options);
}

export async function getPublishedResourceSummaries(options: {
  type?: ResourceType;
  limit?: number;
  offset?: number;
} = {}) {
  return listPublishedResourceSummaries(options);
}

export async function getPublishedResourcesByTypes(options: {
  types: ResourceType[];
  limit?: number;
  offset?: number;
}) {
  return listPublishedResourcesByTypes(options);
}

export async function getPublishedResourcesByPathPrefix(prefix: string, limit?: number) {
  return listPublishedResourcesByPathPrefix(prefix, limit);
}

export async function getPublishedResourceSummariesByPathPrefix(prefix: string, limit?: number) {
  return listPublishedResourceSummariesByPathPrefix(prefix, limit);
}

export async function getPublishedResourceCount(type?: ResourceType) {
  return countPublishedResources(type);
}

export async function getPublicResourceRoutes() {
  return listPublicResourceRoutes();
}

export function parsePublicSearchCollection(
  value: string | null
): PublicSearchCollection | null {
  return publicSearchCollections.includes(value as PublicSearchCollection)
    ? value as PublicSearchCollection
    : null;
}

export async function searchPublicResources(
  query: string,
  collection: PublicSearchCollection,
  limit?: number
) {
  return searchPublishedResources(query, collection, limit);
}

export async function getPublicRedirect(path: string) {
  return findRedirectByPath(normalizeResourcePath(path));
}
