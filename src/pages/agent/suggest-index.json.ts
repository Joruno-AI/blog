import { loadFullIndex } from '~/utils/skills-data'

import type { APIRoute } from 'astro'

export const prerender = true

export const GET: APIRoute = () => {
  const items = loadFullIndex().map((item) => ({
    f: item.f,
    n: item.n,
    a: item.a,
    c: item.c,
    s: item.s,
  }))

  return new Response(JSON.stringify({ items }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
