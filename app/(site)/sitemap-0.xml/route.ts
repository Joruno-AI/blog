import { buildSnapshotSitemapXml } from "@/lib/parity/public-content-endpoints";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildSnapshotSitemapXml(), {
    headers: { "Content-Type": "application/xml" },
  });
}
