import type { ResourceType } from "@/modules/resources/domain/types";
import type { AstroMarkdownTree } from "@/lib/parity/astro-markdown-tree";

type FileSystemModule = {
  readFileSync(path: string, encoding: "utf8"): string;
};

type PathModule = {
  resolve(...paths: string[]): string;
};

type BuildContentResource = {
  id: string;
  type: ResourceType;
  slug: string;
  path: string;
  visibility: "public";
  revisionId: string;
  content: string;
  astroMarkdownTree: AstroMarkdownTree | null;
};

type BuildContentSnapshot = {
  schemaVersion: 2;
  contentRevision: string;
  resources: BuildContentResource[];
};

export type BuildOnlyPublicContent = Pick<
  BuildContentResource,
  "id" | "type" | "slug" | "path" | "revisionId" | "content" | "astroMarkdownTree"
>;

let contentByPath: Map<string, BuildContentResource> | null | undefined;

function normalizePath(path: string) {
  const value = path.startsWith("/") ? path : `/${path}`;
  return value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;
}

function builtinModule<T>(id: string): T | null {
  try {
    if (typeof process === "undefined" || typeof process.getBuiltinModule !== "function") {
      return null;
    }
    return (process.getBuiltinModule(id) as T | undefined) ?? null;
  } catch {
    return null;
  }
}

function loadBuildContent() {
  if (contentByPath !== undefined) return contentByPath;

  const fs = builtinModule<FileSystemModule>("fs");
  const path = builtinModule<PathModule>("path");
  if (!fs || !path) {
    contentByPath = null;
    return null;
  }

  try {
    // Construct the name at runtime so Worker file tracing does not turn the
    // five-megabyte corpus into a server bundle asset.
    const filename = ["public", "content", "build"].join("-") + ".json";
    const file = path.resolve(process.cwd(), "lib", "parity", "data", filename);
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      contentByPath = null;
      return null;
    }
    const snapshot = parsed as Partial<BuildContentSnapshot>;
    if (snapshot.schemaVersion !== 2 || !Array.isArray(snapshot.resources)) {
      contentByPath = null;
      return null;
    }

    const next = new Map<string, BuildContentResource>();
    for (const candidate of snapshot.resources) {
      if (
        !candidate
        || candidate.visibility !== "public"
        || typeof candidate.path !== "string"
        || typeof candidate.revisionId !== "string"
        || typeof candidate.content !== "string"
        || !(candidate.astroMarkdownTree === null || Array.isArray(candidate.astroMarkdownTree))
      ) {
        continue;
      }
      next.set(normalizePath(candidate.path), candidate);
      if (candidate.type === "document" && candidate.path.startsWith("/changelog/")) {
        next.set(`/changelog/${candidate.slug}`, candidate);
      }
    }
    contentByPath = next;
    return next;
  } catch {
    // The file deliberately does not ship with the Worker. A cache miss at
    // runtime falls through to the authoritative D1 query in each page.
    contentByPath = null;
    return null;
  }
}

export function getBuildOnlyPublicContent(
  resourcePath: string,
  expectedRevisionId: string,
): BuildOnlyPublicContent | null {
  const resource = loadBuildContent()?.get(normalizePath(resourcePath));
  if (!resource || resource.revisionId !== expectedRevisionId) return null;
  return resource;
}
