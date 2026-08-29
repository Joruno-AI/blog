export function normalizeMusicResourceId(id: string, type: "album" | "track") {
  let decoded = id;
  try {
    decoded = decodeURIComponent(id);
  } catch {
    // Preserve malformed input so it safely resolves to no database row.
  }
  return decoded.startsWith(`${type}:`) ? decoded : `${type}:${decoded}`;
}

export function musicResourceIdCandidates(id: string, type: "album" | "track") {
  const normalized = normalizeMusicResourceId(id, type);
  return normalized === id ? [id] : [id, normalized];
}
