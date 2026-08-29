import type { AnyD1Database } from "drizzle-orm/d1";

interface PlatformR2Object {
  key: string;
  size: number;
  uploaded: Date;
}

interface PlatformR2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
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
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    CRON_SECRET: string;
    WORKER_SELF_REFERENCE: {
      fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
    };
  }
}

export {};
