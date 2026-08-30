import {
  photoCollectionFromResources,
  photoCollectionResponse,
} from "@/lib/parity/photo-resources";
import { collectAllPages } from "@/lib/parity/public-endpoints";
import { getPublishedResources } from "@/modules/resources/application/queries";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  const resources = await collectAllPages(
    (offset, limit) => getPublishedResources({
      type: "photo",
      offset,
      limit,
    }),
    100
  );
  return photoCollectionResponse(file, await photoCollectionFromResources(resources));
}
