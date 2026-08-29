import { and, asc, eq, lte, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import { platformJobs, resources } from "@/lib/db/schema";
import { publishResource } from "@/modules/resources/application/commands";

const DEFAULT_BATCH_SIZE = 25;
const RETRY_DELAY_MS = 5 * 60 * 1_000;

export async function runScheduledPublications(limit = DEFAULT_BATCH_SIZE) {
  const batchSize = Math.min(Math.max(limit, 1), 100);
  const jobId = crypto.randomUUID();
  const startedAt = new Date();
  await db.insert(platformJobs).values({
    id: jobId,
    type: "publish_scheduled_resources",
    status: "running",
    progress: 0,
    attempts: 1,
    maxAttempts: 1,
    inputJson: JSON.stringify({ limit: batchSize }),
    startedAt,
    createdAt: startedAt,
    updatedAt: startedAt,
  });

  const due = await db
    .select({
      id: resources.id,
      scheduledAt: resources.scheduledAt,
      publishedRevisionId: resources.publishedRevisionId,
    })
    .from(resources)
    .where(and(
      ne(resources.status, "archived"),
      lte(resources.scheduledAt, startedAt)
    ))
    .orderBy(asc(resources.scheduledAt))
    .limit(batchSize);

  const published: string[] = [];
  const failed: Array<{ resourceId: string; error: string }> = [];

  for (const item of due) {
    const claimed = await db
      .update(resources)
      .set({ scheduledAt: null, updatedAt: new Date() })
      .where(and(eq(resources.id, item.id), lte(resources.scheduledAt, startedAt)))
      .returning({ id: resources.id });
    if (claimed.length === 0) continue;

    try {
      await publishResource(item.id, null, new Date());
      published.push(item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown publication failure";
      failed.push({ resourceId: item.id, error: message });
      await db
        .update(resources)
        .set({
          status: item.publishedRevisionId ? "published" : "scheduled",
          scheduledAt: new Date(Date.now() + RETRY_DELAY_MS),
          updatedAt: new Date(),
        })
        .where(eq(resources.id, item.id));
    }

    await db
      .update(platformJobs)
      .set({
        progress: Math.round(((published.length + failed.length) / Math.max(due.length, 1)) * 100),
        updatedAt: new Date(),
      })
      .where(eq(platformJobs.id, jobId));
  }

  const completedAt = new Date();
  const output = { scanned: due.length, published, failed };
  await db
    .update(platformJobs)
    .set({
      status: failed.length ? "failed" : "completed",
      progress: 100,
      outputJson: JSON.stringify(output),
      error: failed.length ? `${failed.length} scheduled publication(s) failed.` : null,
      completedAt,
      updatedAt: completedAt,
    })
    .where(eq(platformJobs.id, jobId));

  return { jobId, ...output };
}
