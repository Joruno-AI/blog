import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { tags, postTags, type NewTag } from "@/lib/db/schema";

export async function getTags() {
  const result = await db.query.tags.findMany({
    orderBy: [asc(tags.name)],
  });

  return result;
}

export async function getTagsWithPostCount() {
  const result = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      postCount: sql<number>`count(${postTags.postId})`,
    })
    .from(tags)
    .leftJoin(postTags, eq(postTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(asc(tags.name));

  return result;
}

export async function getTagById(id: string) {
  const result = await db.query.tags.findFirst({
    where: eq(tags.id, id),
  });

  return result;
}

export async function getTagBySlug(slug: string) {
  const result = await db.query.tags.findFirst({
    where: eq(tags.slug, slug),
  });

  return result;
}

export async function createTag(data: NewTag) {
  const result = await db.insert(tags).values(data).returning();
  return (result as unknown as NewTag[])[0];
}

export async function updateTag(id: string, data: Partial<NewTag>) {
  const result = await db
    .update(tags)
    .set(data)
    .where(eq(tags.id, id))
    .returning();
  return (result as unknown as NewTag[])[0];
}

export async function deleteTag(id: string) {
  await db.delete(tags).where(eq(tags.id, id));
}

export async function getOrCreateTag(name: string, slug: string): Promise<string> {
  const existing = await getTagBySlug(slug);
  if (existing) {
    return existing.id;
  }

  const newTag = await createTag({
    id: crypto.randomUUID(),
    name,
    slug,
  });

  return newTag.id;
}

