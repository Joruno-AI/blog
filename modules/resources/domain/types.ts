import { z } from "zod";

export const resourceTypes = [
  "article",
  "document",
  "photo",
  "album",
  "track",
  "podcast",
  "course",
  "lesson",
  "tool",
  "project",
  "short",
  "download",
  "collection",
] as const;

export const resourceStatuses = [
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
] as const;

export const resourceVisibilities = [
  "public",
  "unlisted",
  "private",
] as const;

export const contentFormats = ["markdown", "json", "text", "html"] as const;

export type ResourceType = (typeof resourceTypes)[number];
export type ResourceStatus = (typeof resourceStatuses)[number];
export type ResourceVisibility = (typeof resourceVisibilities)[number];
export type ContentFormat = (typeof contentFormats)[number];

export const resourceDraftSchema = z.object({
  type: z.enum(resourceTypes),
  title: z.string().trim().min(1).max(300),
  slug: z.string().trim().min(1).max(500),
  path: z.string().trim().min(1).max(1_500),
  description: z.string().max(4_000).nullable().optional(),
  visibility: z.enum(resourceVisibilities).default("public"),
  content: z.string(),
  contentFormat: z.enum(contentFormats).default("markdown"),
  metadata: z.record(z.string(), z.unknown()).default({}),
  authorId: z.string().nullable().optional(),
  changeSummary: z.string().trim().max(500).nullable().optional(),
});

export const revisionDraftSchema = resourceDraftSchema.pick({
  title: true,
  description: true,
  content: true,
  contentFormat: true,
  metadata: true,
  changeSummary: true,
});

export type ResourceDraftInput = z.input<typeof resourceDraftSchema>;
export type RevisionDraftInput = z.input<typeof revisionDraftSchema>;

export function assertContentFitsD1(content: string) {
  const bytes = new TextEncoder().encode(content).byteLength;
  // Keep headroom below D1's 2 MB maximum row/string size for metadata and
  // future schema evolution.
  if (bytes > 1_800_000) {
    throw new Error(
      `Resource content is ${bytes} bytes; move large payloads to R2 and keep the D1 revision below 1.8 MB.`
    );
  }
}
