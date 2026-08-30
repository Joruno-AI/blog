export type ResolvedPublicContentPath = {
  kind: "redirect" | "resource";
  toPath: string | null;
  statusCode: number | null;
  resourceId: string | null;
  visibility: "public" | "unlisted" | "private" | null;
  revisionVisibility: "public" | "unlisted" | "private" | null;
};

export function canonicalChangelogSlug(path: string) {
  return path.match(/^\/changelog\/(\d+)$/)?.[1] ?? "";
}

export const PUBLIC_CONTENT_PATH_LOOKUP_SQL = `
  SELECT 'redirect' AS kind, to_path AS toPath, status_code AS statusCode,
          NULL AS resourceId, NULL AS visibility, NULL AS revisionVisibility
  FROM redirects WHERE from_path = ?
  UNION ALL
  SELECT 'resource' AS kind, NULL AS toPath, NULL AS statusCode,
          r.id AS resourceId, r.visibility AS visibility,
          pr.visibility AS revisionVisibility
  FROM resource_routes rr
  JOIN resources r ON r.id = rr.resource_id
  JOIN resource_revisions pr ON pr.id = r.published_revision_id
  WHERE rr.path = ? AND r.status = 'published'
  UNION ALL
  SELECT 'resource' AS kind, NULL AS toPath, NULL AS statusCode,
          r.id AS resourceId, r.visibility AS visibility,
          pr.visibility AS revisionVisibility
  FROM resources r
  JOIN resource_revisions pr ON pr.id = r.published_revision_id
  WHERE ? LIKE '/changelog/%'
    AND r.type = 'document'
    AND pr.path LIKE '/changelog/%'
    AND pr.slug = ?
    AND r.status = 'published'
  LIMIT 1
`;
