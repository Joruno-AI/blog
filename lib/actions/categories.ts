"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { categories, posts } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getCategoryWithDescendantIds } from "@/lib/db/queries/categories";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

export async function createCategory(formData: FormData) {
  const name = formData.get("name") as string;
  const slug = (formData.get("slug") as string) || slugify(name);
  const description = formData.get("description") as string;
  const parentIdValue = formData.get("parentId") as string;
  // Handle "__none__" or empty string as null (no parent)
  const parentId = parentIdValue && parentIdValue !== "__none__" ? parentIdValue : null;

  const id = crypto.randomUUID();

  await db.insert(categories).values({
    id,
    name,
    slug,
    description: description || null,
    parentId,
    order: 0,
  });

  revalidatePath("/studio/categories");
  return { success: true };
}

export async function updateCategory(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const slug = (formData.get("slug") as string) || slugify(name);
  const description = formData.get("description") as string;
  const parentIdValue = formData.get("parentId") as string;
  // Handle "__none__" or empty string as null (no parent)
  const parentId = parentIdValue && parentIdValue !== "__none__" ? parentIdValue : null;

  await db
    .update(categories)
    .set({
      name,
      slug,
      description: description || null,
      parentId,
    })
    .where(eq(categories.id, id));

  revalidatePath("/studio/categories");
  return { success: true };
}

export async function deleteCategory(id: string) {
  // 获取该分类及其所有子分类的ID
  const categoryIds = await getCategoryWithDescendantIds(id);

  // 删除这些分类下的所有文章
  await db.delete(posts).where(inArray(posts.categoryId, categoryIds));

  // 删除所有子分类和该分类本身
  await db.delete(categories).where(inArray(categories.id, categoryIds));

  revalidatePath("/studio/categories");
  revalidatePath("/studio/content");
  return { success: true };
}

