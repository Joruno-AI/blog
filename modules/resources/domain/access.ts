import type { ResourceVisibility } from "./types";

export type ResourceViewer = {
  id: string;
  role: "admin" | "editor" | "viewer";
} | null;

export async function canAccessResource(
  viewer: ResourceViewer,
  resource: { id: string; visibility: ResourceVisibility }
) {
  switch (resource.visibility) {
    case "public":
    case "unlisted":
      return true;
    case "private":
      return viewer?.role === "admin" || viewer?.role === "editor";
  }
}
