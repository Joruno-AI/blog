import { getPublishedResourcesByPathPrefix } from "@/modules/resources/application/queries";
export const dynamic = "force-dynamic";
export async function GET() { const documents = await getPublishedResourcesByPathPrefix("/docs", 1000); return Response.json({ version: 1, documents: documents.map(({ id, title, path, description, metadataJson }) => ({ id, title, path, description, metadata: JSON.parse(metadataJson) })) }, { headers: { "Cache-Control": "public, s-maxage=300" } }); }
