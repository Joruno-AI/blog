import { listPublicPhotos } from "@/modules/photos/application/queries";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) { const file = (await params).file; if (!/^photos\.[^.]+\.json$/.test(file)) return Response.json({ error: "Not found" }, { status: 404 }); const photos = await listPublicPhotos(100); return Response.json(photos, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } }); }
