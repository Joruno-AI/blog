import type { APIRoute } from 'astro'

import { loadAlbums } from '../data.json'

/**
 * 按专辑输出歌词映射 { songId: lrcText },仅含有歌词的歌曲
 */
export async function getStaticPaths() {
  const albums = await loadAlbums()
  return albums.map((album) => ({
    params: { album: album.id },
    props: {
      lyrics: Object.fromEntries(
        album.songs
          .filter((song) => song.lyrics)
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
