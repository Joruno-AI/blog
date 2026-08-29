import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { albums, songs } from "@/lib/db/schema";


interface SongData {
  id: string;
  name: string;
  duration: string;
  url: string;
}

interface AlbumData {
  id: string;
  name: string;
  description?: string;
  artist: string;
  cover?: string;
  color?: string;
  songs: SongData[];
}

export async function POST(request: NextRequest) {
  try {
    const data: AlbumData[] = await request.json();

    const results = [];

    for (const albumData of data) {
      // Create album
      const albumId = crypto.randomUUID();
      const slug = albumData.id; // Use the original id as slug for compatibility

      await db.insert(albums).values({
        id: albumId,
        name: albumData.name,
        slug,
        artist: albumData.artist,
        description: albumData.description || null,
        cover: albumData.cover || null,
        color: albumData.color || "#1a1a2e",
        published: true, // Import as published
        order: 0,
        releaseDate: null,
      });

      // Create songs
      for (let i = 0; i < albumData.songs.length; i++) {
        const songData = albumData.songs[i];
        const songId = crypto.randomUUID();

        // Parse duration to seconds
        let durationSeconds: number | null = null;
        if (songData.duration && songData.duration !== "0:00") {
          const parts = songData.duration.split(":").map(Number);
          if (parts.length === 2) {
            durationSeconds = parts[0] * 60 + parts[1];
          }
        }

        await db.insert(songs).values({
          id: songId,
          albumId,
          name: songData.name,
          duration: songData.duration || "0:00",
          durationSeconds,
          url: songData.url || null,
          externalUrl: null,
          sourceType: "upload",
          trackNumber: i + 1,
          lyrics: null,
        });
      }

      results.push({
        album: albumData.name,
        songsCount: albumData.songs.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${results.length} albums`,
      results,
    });
  } catch (error) {
    console.error("Error importing music:", error);
    return NextResponse.json(
      { error: "Failed to import music", details: String(error) },
      { status: 500 }
    );
  }
}
