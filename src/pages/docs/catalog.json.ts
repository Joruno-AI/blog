import { geektimeCatalog } from '~/utils/geektime'

export function GET() {
  return new Response(JSON.stringify(geektimeCatalog), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  })
}
