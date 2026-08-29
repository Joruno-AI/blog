import { getPublishedResourcesByPathPrefix } from "@/modules/resources/application/queries";
export const dynamic = "force-dynamic";
export async function GET() { const resources = await getPublishedResourcesByPathPrefix("/agent", 1000); return Response.json(resources.map(({ id, title, path, description }) => ({ id, title, path, description })), { headers: { "Cache-Control": "public, s-maxage=300" } }); }
