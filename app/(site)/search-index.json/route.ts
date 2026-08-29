import { getPublishedResourcesByTypes } from "@/modules/resources/application/queries";
export const dynamic = "force-dynamic";
export async function GET() {
  const resources = await getPublishedResourcesByTypes({ types: ["article", "short", "document", "project", "tool"], limit: 1000 });
  return Response.json(resources.map(({ id, type, title, path, description, content, publishedAt }) => ({ id, type, title, path, description, content, publishedAt })), { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
