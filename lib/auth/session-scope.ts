export function requiresPlatformSession(pathname: string) {
  const within = (route: string) => pathname === route || pathname.startsWith(`${route}/`);
  if (pathname === "/login" || within("/studio")) return true;
  return within("/api")
    && !within("/api/public")
    && !within("/api/auth")
    && pathname !== "/api/jobs/run";
}
