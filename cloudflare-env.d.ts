import type { AnyD1Database } from "drizzle-orm/d1";

interface PlatformR2Object {
  key: string;
  size: number;
  uploaded: Date;
  body: ReadableStream<Uint8Array>;
  text(): Promise<string>;
}

interface PlatformR2UploadedPart {
  partNumber: number;
  etag: string;
}

interface PlatformR2MultipartUpload {
  uploadPart(partNumber: number, value: ArrayBuffer | ArrayBufferView | string): Promise<PlatformR2UploadedPart>;
  complete(parts: PlatformR2UploadedPart[]): Promise<PlatformR2Object>;
  abort(): Promise<void>;
}

interface PlatformR2Bucket {
  get(key: string): Promise<PlatformR2Object | null>;
  head(key: string): Promise<PlatformR2Object | null>;
  put(
    key: string,
    value: string | ReadableStream<Uint8Array> | ArrayBuffer | ArrayBufferView,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  createMultipartUpload(
    key: string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<PlatformR2MultipartUpload>;
  delete(key: string | string[]): Promise<void>;
  list(options?: { prefix?: string; cursor?: string }): Promise<{
    objects: PlatformR2Object[];
    truncated: boolean;
    cursor?: string;
  }>;
}

declare global {
  interface CloudflareEnv {
    DB: AnyD1Database;
    R2_BUCKET: PlatformR2Bucket;
    CONTENT_IMPORT_BUCKET: PlatformR2Bucket;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    CRON_SECRET: string;
    /** owner/repository target for the CMS public-content repository_dispatch. */
    PUBLIC_REBUILD_GITHUB_REPOSITORY?: string;
    /** Fine-grained GitHub token with Contents: write on the target repository. */
    PUBLIC_REBUILD_GITHUB_TOKEN?: string;
    /** Present only on the non-mutating review Worker. */
    REVIEW_READ_ONLY?: string;
    WORKER_SELF_REFERENCE: {
      fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
    };
  }
}

export {};
