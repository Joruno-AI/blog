"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

export async function createTag(formData: FormData) {
  const name = formData.get("name") as string;
  const slug = (formData.get("slug") as string) || slugify(name);

  const id = crypto.randomUUID();

  await db.insert(tags).values({
    id,
    name,
    slug,
  });

  revalidatePath("/studio/tags");
  return { success: true };
}

export async function updateTag(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const slug = (formData.get("slug") as string) || slugify(name);

  await db
    .update(tags)
    .set({
      name,
      slug,
    })
    .where(eq(tags.id, id));

  revalidatePath("/studio/tags");
  return { success: true };
}

export async function deleteTag(id: string) {
  await db.delete(tags).where(eq(tags.id, id));
  revalidatePath("/studio/tags");
  return { success: true };
}

