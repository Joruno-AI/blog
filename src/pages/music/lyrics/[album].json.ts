import type { APIRoute } from 'astro'

import audioQualityData from '~/content/music/audio-quality.json'
import lyricAlignmentData from '~/content/music/lyric-alignment.json'
import studioValidationData from '../../../../reports/music-studio-validation.json'

import { loadAlbums } from '../data.json'

/**
 * 按专辑输出歌词映射 { songId: lrcText },仅含有歌词的歌曲
 */
export async function getStaticPaths() {
  const albums = await loadAlbums()
  const qualityBySong = audioQualityData.songs as Record<
    string,
    { lyricsMismatch: boolean }
  >
  const studioBySong = Object.fromEntries(
    studioValidationData.results.map((item) => [item.id, item])
  ) as Record<string, { url: string | null; studioStatus: string }>
  const lyricAlignmentBySong = lyricAlignmentData.songs as Record<
    string,
    { verified: boolean }
  >
  return albums.map((album) => ({
    params: { album: album.id },
    props: {
      lyrics: Object.fromEntries(
        album.songs
          .filter(
            (song) =>
              song.lyrics &&
              !qualityBySong[song.id]?.lyricsMismatch &&
              lyricAlignmentBySong[song.id]?.verified === true &&
              (!song.url ||
                (studioBySong[song.id]?.url === song.url &&
                  studioBySong[song.id]?.studioStatus ===
                    'verified-studio-master'))
          )
          .map((song) => [song.id, song.lyrics])
      ),
    },
  }))
}

export const GET: APIRoute = ({ props }) => {
  return new Response(JSON.stringify(props.lyrics), {
    headers: { 'Content-Type': 'application/json' },
  })
}
