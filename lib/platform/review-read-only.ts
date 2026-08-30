type ReviewEnvironment = {
  REVIEW_READ_ONLY?: string;
};

const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function readCanMutateSharedState(request: Request) {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;
  const rawPathname = new URL(request.url).pathname;
  let pathname = rawPathname;
  try {
    pathname = decodeURIComponent(rawPathname).replace(/\/{2,}/g, "/");
  } catch {
    // A malformed escape below the literal auth prefix is still an auth path.
  }

  // Better Auth exposes state-changing callbacks over GET (email verification,
  // OAuth callbacks and session refresh). Next can also synthesize HEAD from a
  // GET handler, so the whole auth endpoint is closed on a shared review DB.
  return pathname === "/api/auth" || pathname.startsWith("/api/auth/");
}

/**
 * Review Workers intentionally read the production content snapshot so visual
 * approval is meaningful. Keep that shared snapshot immutable: every method
 * capable of changing D1/R2 state is stopped before OpenNext handles it.
 */
export function reviewReadOnlyResponse(
  request: Request,
  environment: ReviewEnvironment,
): Response | null {
  if (environment.REVIEW_READ_ONLY !== "true") {
    return null;
  }
  if (
    READ_ONLY_METHODS.has(request.method.toUpperCase())
    && !readCanMutateSharedState(request)
  ) {
    return null;
  }

  return Response.json(
    { error: "The review deployment is read-only." },
    {
      status: 423,
      headers: {
        "cache-control": "no-store",
        "x-review-read-only": "true",
      },
    },
  );
}
