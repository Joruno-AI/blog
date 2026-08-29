"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAlbumById } from "@/lib/db/queries/albums";
import {
  archiveAlbumResource,
  createAlbumResource,
  reorderAlbumResources,
  setAlbumPublished,
  updateAlbumResource,
} from "@/modules/music/application/music-service";

function albumFormInput(formData: FormData) {
  const releaseDate = String(formData.get("releaseDate") || "");
  return {
    name: String(formData.get("name") || ""),
    artist: String(formData.get("artist") || ""),
    description: String(formData.get("description") || "") || null,
    cover: String(formData.get("cover") || "") || null,
    color: String(formData.get("color") || "") || "#1a1a2e",
    releaseDate: releaseDate ? new Date(releaseDate) : null,
    published: formData.get("published") === "true",
  };
}

export async function createAlbum(formData: FormData) {
  await createAlbumResource(albumFormInput(formData));
  revalidatePath("/studio/music");
  revalidatePath("/music");
  redirect("/studio/music");
}

export async function updateAlbum(id: string, formData: FormData) {
  const existing = await getAlbumById(id);
  if (!existing) throw new Error("Album not found");
  await updateAlbumResource(id, { ...albumFormInput(formData), order: existing.order });
  revalidatePath("/studio/music");
  revalidatePath("/music");
  revalidatePath(`/music/albums/${existing.slug}`);
  redirect(`/studio/music/albums/${id}`);
}

export async function deleteAlbum(id: string) {
  await archiveAlbumResource(id);
  revalidatePath("/studio/music");
  revalidatePath("/music");
}

export async function toggleAlbumPublish(id: string) {
  await setAlbumPublished(id);
  revalidatePath("/studio/music");
  revalidatePath("/music");
}

export async function reorderAlbums(orders: { id: string; order: number }[]) {
  await reorderAlbumResources(orders);
  revalidatePath("/studio/music");
  revalidatePath("/music");
}
