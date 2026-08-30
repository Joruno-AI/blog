import { getSelectedAgentSkills } from "@/lib/agent/queries";
import { cachedAgentResponse } from "@/lib/agent/platform-cache";

const CACHE_CONTROL = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

function responseEtag(body: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < body.length; index += 1) {
    hash ^= body.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `W/\"agent-selected-${body.length.toString(36)}-${(hash >>> 0).toString(16)}\"`;
}

function notModified(etag: string) {
  return new Response(null, {
    status: 304,
    headers: {
      "Cache-Control": CACHE_CONTROL,
      ETag: etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request) {
  try {
    const response = await cachedAgentResponse(request, async () => {
      const skills = await getSelectedAgentSkills();
      const body = JSON.stringify({
        items: skills.map((skill) => ({
          f: skill.f,
          ...(skill.descZh ? { z: skill.descZh } : {}),
          ...(skill.installs ? { i: skill.installs } : {}),
          ...(skill.keywords ? { k: skill.keywords } : {}),
          ...(skill.pushedAt ? { p: skill.pushedAt } : {}),
          ...(skill.createdAt ? { r: skill.createdAt } : {}),
          ...(skill.language ? { l: skill.language } : {}),
          ...(skill.starsDelta ? { x: skill.starsDelta } : {}),
        })),
      });
      return new Response(body, {
        headers: {
          "Cache-Control": CACHE_CONTROL,
          "Content-Type": "application/json; charset=utf-8",
          ETag: responseEtag(body),
          "X-Content-Type-Options": "nosniff",
        },
      });
    });

    const etag = response.headers.get("ETag");
    if (etag && request.headers.get("If-None-Match") === etag) return notModified(etag);
    return response;
  } catch {
    return Response.json({ items: [] }, {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}
