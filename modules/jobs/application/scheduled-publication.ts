import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { platformJobs, resources } from "@/lib/db/schema";
import { setAlbumResourceGroupPublished } from "@/modules/music/application/music-service";
import { publishResource } from "@/modules/resources/application/commands";
import {
  ResourcePublicationConflictError,
  setResourceGroupPublished,
} from "@/modules/resources/infrastructure/resource-repository";

const DEFAULT_BATCH_SIZE = 25;
const RETRY_DELAY_MS = 5 * 60 * 1_000;

export async function runScheduledPublications(
  limit = DEFAULT_BATCH_SIZE,
  options: {
    database?: typeof db;
    now?: () => Date;
  } = {},
) {
  const database = options.database ?? db;
  const now = options.now ?? (() => new Date());
  const batchSize = Math.min(Math.max(limit, 1), 100);
  const jobId = crypto.randomUUID();
  const startedAt = now();
  await database.insert(platformJobs).values({
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

  const due = await database
    .select({
      id: resources.id,
      type: resources.type,
      currentRevisionId: resources.currentRevisionId,
      scheduledAt: resources.scheduledAt,
      publishedRevisionId: resources.publishedRevisionId,
      status: resources.status,
    })
    .from(resources)
    .where(and(
      inArray(resources.status, ["scheduled", "published"]),
      lte(resources.scheduledAt, startedAt)
    ))
    .orderBy(asc(resources.scheduledAt))
    .limit(batchSize);

  const published: string[] = [];
  const skipped: Array<{ resourceId: string; reason: string }> = [];
  const failed: Array<{ resourceId: string; error: string }> = [];

  for (const item of due) {
    if (!item.currentRevisionId || !item.scheduledAt) continue;

    try {
      if (item.type === "album") {
        await setAlbumResourceGroupPublished({
          resourceId: item.id,
          published: true,
          expectedCurrentRevisionIds: {
            [item.id]: item.currentRevisionId,
          },
          expectedLifecycles: {
            [item.id]: item,
          },
        }, database);
      } else if (item.type === "track") {
        await setResourceGroupPublished({
          resourceIds: [item.id],
          published: true,
          expectedCurrentRevisionIds: {
            [item.id]: item.currentRevisionId,
          },
          expectedLifecycles: {
            [item.id]: item,
          },
        }, database);
      } else {
        await publishResource(
          item.id,
          null,
          now(),
          { expectedLifecycle: item },
          database,
        );
      }
      published.push(item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown publication failure";
      if (error instanceof ResourcePublicationConflictError) {
        // A user archived, rescheduled, unpublished, or saved a newer draft
        // after the due scan. That newer intent owns the row; do not retry it.
        skipped.push({ resourceId: item.id, reason: message });
      } else {
        failed.push({ resourceId: item.id, error: message });
        const retryAt = new Date(now().getTime() + RETRY_DELAY_MS);
        // Retrying is itself a complete lifecycle CAS. If publication actually
        // committed before a transport error, or a user changed the resource,
        // this update matches zero rows and cannot reset the successful/newer
        // lifecycle state.
        await database
          .update(resources)
          .set({
            scheduledAt: retryAt,
            updatedAt: now(),
          })
          .where(and(
            eq(resources.id, item.id),
            sql`${resources.currentRevisionId} IS ${item.currentRevisionId}`,
            sql`${resources.publishedRevisionId} IS ${item.publishedRevisionId}`,
            eq(resources.status, item.status),
            sql`${resources.scheduledAt} IS ${Math.floor(item.scheduledAt.getTime() / 1_000)}`,
          ));
      }
    }

    await database
      .update(platformJobs)
      .set({
        progress: Math.round(((published.length + skipped.length + failed.length) / Math.max(due.length, 1)) * 100),
        updatedAt: now(),
      })
      .where(eq(platformJobs.id, jobId));
  }

  const completedAt = now();
  const output = { scanned: due.length, published, skipped, failed };
  await database
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
