import { ASTRO_MANIFEST } from "@/lib/parity/public-endpoints";

export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(ASTRO_MANIFEST), {
    headers: {
      "Content-Type": "application/manifest+json",
    },
  });
}
