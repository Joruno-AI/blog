import { ASTRO_ROBOTS_TXT } from "@/lib/parity/public-endpoints";

export const dynamic = "force-static";

export function GET() {
  return new Response(ASTRO_ROBOTS_TXT, {
    headers: {
      "Cache-Control": "public, max-age=14400, must-revalidate",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
