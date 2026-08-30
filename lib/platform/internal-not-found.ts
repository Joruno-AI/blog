export const INTERNAL_NOT_FOUND_PATH = "/_legacy-404";
export const INTERNAL_NOT_FOUND_RESPONSE_HEADER = "x-platform-not-found";

export function isInternalNotFoundPath(pathname: string) {
  let normalized = pathname;
  try {
    normalized = decodeURIComponent(pathname);
  } catch {
    // A malformed escape is never equal to the private render path.
  }
  return normalized === INTERNAL_NOT_FOUND_PATH || normalized === `${INTERNAL_NOT_FOUND_PATH}/`;
}

/** Create a GET/HEAD request for the private custom 404 render target. */
export function asInternalNotFoundRequest<T extends Request>(request: T): T {
  const url = new URL(request.url);
  url.pathname = INTERNAL_NOT_FOUND_PATH;

  return new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
    redirect: request.redirect,
    signal: request.signal,
  }) as T;
}

export function isDocumentNotFoundResponse(request: Request, response: Response) {
  if (response.status !== 404) return false;
  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("text/html") || request.headers.has("rsc");
}

export function responseWithNotFoundStatus(response: Response, status: 200 | 404) {
  const headers = new Headers(response.headers);
  headers.delete(INTERNAL_NOT_FOUND_RESPONSE_HEADER);
  return new Response(response.body, {
    status,
    statusText: status === 200 ? "OK" : "Not Found",
    headers,
  });
}
