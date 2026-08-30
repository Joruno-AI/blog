import scenesData from "@/lib/parity/data/agent-scenes.json";

const agentSceneSlugs = new Set(scenesData.scenes.map((scene) => scene.slug));

/**
 * Classify an exact Agent scene-detail URL. `null` means the URL is not a
 * scene-detail shape; `false` means it has the shape but no migrated scene.
 */
export function isKnownAgentScenePath(pathname: string): boolean | null {
  const match = pathname.match(/^\/agent\/scenes\/([^/]+)\/?$/);
  if (!match) return null;

  try {
    return agentSceneSlugs.has(decodeURIComponent(match[1]));
  } catch {
    return false;
  }
}
