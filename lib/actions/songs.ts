"use server";

import { revalidatePath } from "next/cache";

import {
  archiveTrackResource,
  createTrackResource,
  reorderTrackResources,
  updateTrackResource,
} from "@/modules/music/application/music-service";

function durationSeconds(duration: string) {
  if (!duration) return null;
  const values = duration.split(":").map(Number);
  if (values.some(Number.isNaN)) return null;
  if (values.length === 2) return values[0] * 60 + values[1];
  if (values.length === 3) return values[0] * 3_600 + values[1] * 60 + values[2];
  return null;
}

function songFormInput(formData: FormData) {
  const duration = String(formData.get("duration") || "");
  return {
    name: String(formData.get("name") || ""),
    duration: duration || null,
    durationSeconds: durationSeconds(duration),
    url: String(formData.get("url") || "") || null,
    externalUrl: String(formData.get("externalUrl") || "") || null,
    sourceType: (formData.get("sourceType") as "upload" | "external") || "upload",
    lyrics: String(formData.get("lyrics") || "") || null,
  };
}

export async function createSong(formData: FormData) {
  const albumId = String(formData.get("albumId") || "");
  const created = await createTrackResource({ albumId, ...songFormInput(formData) });
  revalidatePath(`/studio/music/albums/${albumId}`);
  revalidatePath("/music");
  return { id: created.id };
}

export async function updateSong(id: string, formData: FormData) {
  await updateTrackResource(id, songFormInput(formData));
  revalidatePath("/studio/music");
  revalidatePath("/music");
}

export async function deleteSong(id: string) {
  await archiveTrackResource(id);
  revalidatePath("/studio/music");
  revalidatePath("/music");
}

export async function reorderSongs(
  albumId: string,
  orders: { id: string; trackNumber: number }[]
) {
  await reorderTrackResources(orders);
  revalidatePath(`/studio/music/albums/${albumId}`);
  revalidatePath("/music");
}
