import { headers } from "next/headers";

import type { ResourceViewer } from "@/modules/resources/domain/access";

export async function getRequestViewer(): Promise<ResourceViewer> {
  const requestHeaders = await headers();
  const id = requestHeaders.get("x-platform-user-id");
  const role = requestHeaders.get("x-platform-user-role");
  if (!id || (role !== "admin" && role !== "editor" && role !== "viewer")) {
    return null;
  }
  return { id, role };
}
