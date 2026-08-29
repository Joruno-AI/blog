export function normalizeArticleResourceId(id: string) {
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {
    // Preserve malformed input so it safely resolves to no database row.
  }
  return decoded.startsWith("article:") ? decoded : `article:${decoded}`;
}

export function articleResourceIdCandidates(id: string) {
  const normalized = normalizeArticleResourceId(id);
  return normalized === id ? [id] : [id, normalized];
}
