import type { APIRoute } from 'astro'

import localAlbumsData from '~/content/music/data.json'
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

export const GET: APIRoute = async () => {
  const albums = await loadAlbums()
  const payload = albums.map((album) => ({
    id: album.id,
    name: album.name,
    artist: album.artist,
    description: album.description ?? null,
    cover: album.cover ?? null,
    color: album.color ?? '#1a1a2e',
    releaseDate: album.releaseDate ?? null,
    songs: album.songs.map((song) => ({
      id: song.id,
      name: song.name,
      duration: song.duration,
      url: song.url ?? null,
      hasLyrics: Boolean(song.lyrics),
    })),
  }))
  return new Response(JSON.stringify({ albums: payload }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
