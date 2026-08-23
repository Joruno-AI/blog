import type { APIRoute } from 'astro'

import audioQualityData from '~/content/music/audio-quality.json'
import lyricAlignmentData from '~/content/music/lyric-alignment.json'
import lyricAlignmentReport from '../../../../reports/music-lyric-alignment.json'
import studioValidationData from '../../../../reports/music-studio-validation.json'

import { loadAlbums } from '../data.json'

interface AlignmentLine {
  text: string
  alignedStart?: number | null
  originalStart?: number | null
}

interface AlignmentResult {
  id: string
  status: string
  lines: AlignmentLine[]
}

function formatTimestamp(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds - minutes * 60
  return `${String(minutes).padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`
}

function buildAlignedLyrics(lines: AlignmentLine[]): string | null {
  const lrc = lines
    .map((line) => {
      const start = line.alignedStart ?? line.originalStart
      const text = line.text.trim()
      if (start == null || !Number.isFinite(start) || !text) return null
      return `[${formatTimestamp(start)}]${text}`
    })
    .filter((line): line is string => Boolean(line))
    .join('\n')
  return lrc || null
}

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
  const alignedLyricsBySong = Object.fromEntries(
    (lyricAlignmentReport.results as AlignmentResult[])
      .filter((result) => result.status === 'verified-aligned')
      .map((result) => [result.id, buildAlignedLyrics(result.lines)])
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
  )
  return albums.map((album) => ({
    params: { album: album.id },
    props: {
      lyrics: Object.fromEntries(
        album.songs
          .filter(
            (song) =>
              !qualityBySong[song.id]?.lyricsMismatch &&
              lyricAlignmentBySong[song.id]?.verified === true &&
              Boolean(alignedLyricsBySong[song.id]) &&
              (!song.url ||
                (studioBySong[song.id]?.url === song.url &&
                  studioBySong[song.id]?.studioStatus ===
                    'verified-studio-master'))
          )
          .map((song) => [song.id, alignedLyricsBySong[song.id]])
      ),
    },
  }))
}

export const GET: APIRoute = ({ props }) => {
  return new Response(JSON.stringify(props.lyrics), {
    headers: { 'Content-Type': 'application/json' },
  })
}
