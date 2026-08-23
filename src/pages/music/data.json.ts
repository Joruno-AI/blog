import type { APIRoute } from 'astro'

import localAlbumsData from '~/content/music/data.json'
import { albumIntroductions } from '~/content/music/album-introductions'
import audioQualityData from '~/content/music/audio-quality.json'
import lyricAlignmentData from '~/content/music/lyric-alignment.json'
import studioValidationData from '../../../reports/music-studio-validation.json'
import { fetchMusic, isCMSEnabled } from '~/utils/cms-api'
import type { CMSAlbum } from '~/utils/cms-api'

/**
 * 构建期生成的音乐数据(不含歌词正文,歌词按专辑另行加载)
 * CMS 未配置或拉取失败时回退本地 data.json
 */
export async function loadAlbums(): Promise<CMSAlbum[]> {
  if (isCMSEnabled()) {
    try {
      const cmsAlbums = await fetchMusic()
      if (cmsAlbums.length > 0) return cmsAlbums
    } catch (e) {
      console.warn('[music] CMS fetch failed, fallback to local data.json:', e)
    }
  }
  return localAlbumsData as unknown as CMSAlbum[]
}

function buildAlbumDescription(album: CMSAlbum): string | null {
  const base = (albumIntroductions[album.id] ?? album.description ?? '').trim()
  if (!base) return null

  const year = album.releaseDate?.slice(0, 4)
  const playableTitles = album.songs
    .map((song) => song.name.trim())
    .filter(Boolean)
    .slice(0, 3)
  const facts = `${year ? `${year} 年发行，` : ''}全辑收录 ${album.songs.length} 首作品。`
  const route = playableTitles.length
    ? `建议从《${playableTitles.join('》《')}》进入，顺着原始曲序感受专辑的情绪起伏与制作层次。`
    : '适合保留完整曲序聆听，感受专辑内部的情绪起伏与制作层次。'

  return `${base} ${facts}${route}`
}

export const GET: APIRoute = async () => {
  const albums = await loadAlbums()
  const studioBySong = Object.fromEntries(
    studioValidationData.results.map((item) => [item.id, item])
  ) as Record<
    string,
    {
      url: string | null
      studioStatus: string
      fingerprintSimilarity: number | null
    }
  >
  const qualityBySong = audioQualityData.songs as Record<
    string,
    {
      actualSeconds: number
      expectedSeconds: number
      incomplete: boolean
      lyricsMismatch: boolean
      issues: string[]
    }
  >
  const lyricAlignmentBySong = lyricAlignmentData.songs as Record<
    string,
    { status: string; verified: boolean }
  >
  const payload = albums.map((album) => ({
    id: album.id,
    name: album.name,
    artist: album.artist,
    description: buildAlbumDescription(album),
    cover: album.cover ?? null,
    color: album.color ?? '#1a1a2e',
    releaseDate: album.releaseDate ?? null,
    songs: album.songs.map((song) => {
      const quality = qualityBySong[song.id]
      const studio = studioBySong[song.id]
      const lyricAlignment = lyricAlignmentBySong[song.id]
      const studioVerified =
        Boolean(song.url) &&
        studio?.url === song.url &&
        studio.studioStatus === 'verified-studio-master'
      const audioUnavailable =
        quality?.incomplete || (Boolean(song.url) && !studioVerified)
      return {
        id: song.id,
        name: song.name,
        duration: song.duration,
        url: audioUnavailable ? null : (song.url ?? null),
        hasLyrics:
          Boolean(song.lyrics) &&
          !quality?.lyricsMismatch &&
          (!song.url || studioVerified) &&
          lyricAlignment?.verified === true,
        quality:
          quality || studio
            ? {
                incomplete: quality?.incomplete ?? false,
                lyricsMismatch: quality?.lyricsMismatch ?? false,
                actualSeconds: quality?.actualSeconds ?? 0,
                expectedSeconds: quality?.expectedSeconds ?? 0,
                studioStatus: studio?.studioStatus ?? 'unvalidated',
                fingerprintSimilarity: studio?.fingerprintSimilarity ?? null,
                lyricsAlignmentStatus:
                  lyricAlignment?.status ?? 'alignment-pending',
              }
            : null,
      }
    }),
  }))
  return new Response(JSON.stringify({ albums: payload }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
