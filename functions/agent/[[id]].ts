interface PagesContext {
  request: Request
  env: {
    ASSETS: { fetch(input: Request | string | URL): Promise<Response> }
  }
  params: Record<string, string | string[] | undefined>
}

const REPO_PART = /^[A-Za-z0-9_.-]{1,100}$/

function pathParts(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value
  return value ? value.split('/').filter(Boolean) : []
}

function assetRequest(request: Request, pathname: string) {
  const url = new URL(request.url)
  url.pathname = pathname
  return new Request(url, request)
}

export async function onRequestGet(context: PagesContext) {
  const source = new URL(context.request.url)
  const legacyPath = source.pathname.replace(/^\/agent(?=\/|$)/, '/skills')
  const asset = await context.env.ASSETS.fetch(
    assetRequest(context.request, legacyPath)
  )
  if (asset.status !== 404) return asset

  const parts = pathParts(context.params.id)
  if (
    parts.length < 2 ||
    !REPO_PART.test(parts[0] ?? '') ||
    !REPO_PART.test(parts[1] ?? '')
  ) {
    return asset
  }

  const shell = await context.env.ASSETS.fetch(
    assetRequest(context.request, '/skills/repository/')
  )
  const headers = new Headers(shell.headers)
  headers.set('Cache-Control', 'public, max-age=300, s-maxage=3600')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set(
    'Link',
    `<https://deepwiki.com/${parts[0]}/${parts[1]}>; rel="related"`
  )
  return new Response(shell.body, {
    status: shell.status,
    statusText: shell.statusText,
    headers,
  })
}

export function onRequest() {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'GET' },
  })
}
