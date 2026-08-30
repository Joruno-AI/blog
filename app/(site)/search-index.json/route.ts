import { buildSnapshotSearchIndexJson } from "@/lib/parity/public-content-endpoints";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildSnapshotSearchIndexJson(), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
