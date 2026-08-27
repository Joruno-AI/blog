interface PagesContext {
  request: Request
}

export function onRequestGet(context: PagesContext) {
  const source = new URL(context.request.url)
  const destination = new URL(source)
  destination.pathname = source.pathname.replace(/^\/skills(?=\/|$)/, '/agent')

  return Response.redirect(destination.toString(), 308)
}

export function onRequest() {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'GET' },
  })
}
