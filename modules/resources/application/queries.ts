import { normalizeResourcePath } from "@/modules/resources/domain/path";
import {
  countEditableResources,
  countPublishedResources,
  findEditableResourceById,
  findPublishedResourceByPath,
  findRedirectByPath,
  listEditableResources,
  listPublicResourceRoutes,
  listPublishedResources,
  listPublishedResourcesByTypes,
  listPublishedResourcesByPathPrefix,
  searchPublishedResources,
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

  const allowed = await canAccessResource(viewer, resource);
  return allowed ? resource : null;
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

export async function getPublishedResourceCount(type?: ResourceType) {
  return countPublishedResources(type);
}

export async function getPublicResourceRoutes() {
  return listPublicResourceRoutes();
}

export async function searchPublicResources(query: string, limit?: number) {
  return searchPublishedResources(query, limit);
}

export async function getPublicRedirect(path: string) {
  return findRedirectByPath(normalizeResourcePath(path));
}
