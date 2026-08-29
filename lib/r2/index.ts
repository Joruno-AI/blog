import { getCloudflareContext } from "@opennextjs/cloudflare";

function getBucket() {
  return getCloudflareContext().env.R2_BUCKET;
}

function getPublicBaseUrl() {
  const value = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, "");
  if (!value) throw new Error("R2_PUBLIC_URL is not configured.");
  return value;
}

export async function uploadFile(
  file: Buffer | Uint8Array | ArrayBuffer,
  fileName: string,
  contentType: string
): Promise<string> {
  return (await uploadAsset(file, fileName, contentType)).url;
}

export async function uploadAsset(
  file: Buffer | Uint8Array | ArrayBuffer,
  fileName: string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const safeName = fileName.normalize("NFKC").replace(/[^\w.\-\u3400-\u9fff]+/g, "-");
  const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  await getBucket().put(key, file, {
    httpMetadata: { contentType },
  });

  return { key, url: getPublicUrl(key) };
}

export async function deleteFile(key: string): Promise<void> {
  await getBucket().delete(key);
}

export async function listFiles(prefix = "uploads/"): Promise<
  Array<{
    key: string;
    size: number;
    lastModified: Date;
  }>
> {
  const files: Array<{ key: string; size: number; lastModified: Date }> = [];
  let cursor: string | undefined;

  do {
    const result = await getBucket().list({ prefix, cursor });
    files.push(...result.objects.map((item) => ({
      key: item.key,
      size: item.size,
      lastModified: item.uploaded,
    })));
    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);

  return files;
}

export function getPublicUrl(key: string): string {
  return `${getPublicBaseUrl()}/${key.replace(/^\/+/, "")}`;
}
