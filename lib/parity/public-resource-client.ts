import type { ResourceType } from "@/modules/resources/domain/types";

export type BrowserPublicResource = {
  id: string;
  type: ResourceType;
  slug: string;
  path: string;
  revisionId: string;
  content: string;
};

export class PublicResourceHttpError extends Error {
  constructor(readonly status: number) {
    super(`Public content API returned HTTP ${status}`);
  }
}

const REVOKED_STATUSES = new Set([401, 403, 404, 410]);

export function isPublicResourceRevokedError(error: unknown) {
  return error instanceof PublicResourceHttpError
    && REVOKED_STATUSES.has(error.status);
}

function normalizePath(path: string) {
  const value = path.startsWith("/") ? path : `/${path}`;
  return value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;
}

function isResource(value: unknown): value is BrowserPublicResource {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Partial<BrowserPublicResource>;
  return typeof record.id === "string"
    && typeof record.type === "string"
    && typeof record.slug === "string"
    && typeof record.path === "string"
    && typeof record.revisionId === "string"
    && typeof record.content === "string";
}

function resourceMatchesRequest(resource: BrowserPublicResource, requestedPath: string) {
  if (normalizePath(resource.path) === requestedPath) return true;
  return resource.type === "document"
    && requestedPath === `/changelog/${resource.slug}`;
}

export function createPublicResourceRequester(fetcher: typeof fetch) {
  const inFlight = new Map<string, Promise<BrowserPublicResource>>();

  return function requestPublicResource(resourcePath: string) {
    const path = normalizePath(resourcePath);
    const cached = inFlight.get(path);
    if (cached) return cached;

    const encodedPath = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
    const baseRequest = fetcher(`/api/public/resources/${encodedPath}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) throw new PublicResourceHttpError(response.status);
      const value: unknown = await response.json();
      if (!isResource(value) || !resourceMatchesRequest(value, path)) {
        throw new PublicResourceHttpError(410);
      }
      return value;
    });
    const trackedRequest = baseRequest.finally(() => {
      // This map performs in-flight deduplication only. Both success and
      // failure must allow a later navigation to observe a new revision.
      if (inFlight.get(path) === trackedRequest) inFlight.delete(path);
    });
    inFlight.set(path, trackedRequest);
    return trackedRequest;
  };
}

export const requestPublicResource = createPublicResourceRequester(
  (...args) => fetch(...args),
);
