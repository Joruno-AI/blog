"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  archiveArticles,
  createArticle,
  updateArticle,
} from "@/modules/articles/application/article-service";

function articleFormData(formData: FormData) {
  const pubDate = String(formData.get("pubDate") ?? "");
  return {
    title: String(formData.get("title") ?? ""),
    subtitle: String(formData.get("subtitle") ?? "") || null,
    content: String(formData.get("content") ?? ""),
    excerpt: String(formData.get("excerpt") ?? "") || null,
    categoryId: String(formData.get("categoryId") ?? "") || null,
    pubDate: pubDate ? new Date(pubDate) : undefined,
    tagIds: formData.getAll("tagIds").map(String),
    draft: formData.get("draft") === "true",
    toc: true,
    share: true,
    giscus: true,
    search: true,
  };
}

export async function createPost(formData: FormData) {
  await createArticle(articleFormData(formData));
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/studio/content");
  redirect("/studio/content");
}

export async function updatePost(id: string, formData: FormData) {
  await updateArticle(id, articleFormData(formData));
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/studio/content");
  redirect("/studio/content");
}

export async function deletePost(id: string) {
  await archiveArticles([id]);
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/studio/content");
}
