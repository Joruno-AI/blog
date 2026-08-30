import { and, sql, type SQLWrapper } from "drizzle-orm";

import { resourceRevisions, resources } from "@/lib/db/schema";

/**
 * Public music is intentionally stricter than a generic "published" row.
 * Both the stable resource and the selected published revision must still be
 * public, otherwise stale visibility pointers could expose private audio or
 * lyrics through an anonymous endpoint.
 */
export function publishedMusicVisibilityCondition(columns?: {
  status: SQLWrapper;
  resourceVisibility: SQLWrapper;
  revisionVisibility: SQLWrapper;
}) {
  const selected = columns ?? {
    status: resources.status,
    resourceVisibility: resources.visibility,
    revisionVisibility: resourceRevisions.visibility,
  };
  return and(
    sql`${selected.status} = 'published'`,
    sql`${selected.resourceVisibility} = 'public'`,
    sql`${selected.revisionVisibility} = 'public'`,
  );
}
