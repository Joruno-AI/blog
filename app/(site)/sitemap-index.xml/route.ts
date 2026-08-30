import { buildAstroSitemapIndexXml } from "@/lib/parity/public-endpoints";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildAstroSitemapIndexXml(), {
    headers: { "Content-Type": "application/xml" },
  });
}
