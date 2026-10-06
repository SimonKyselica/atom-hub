import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from "@/lib/session-token";

const PUBLIC_PATHS = ["/login", "/signup", "/offline", "/logout"];
const REFRESH_AFTER_SECONDS = 60 * 60 * 24; // roll the session cookie at most once a day

// Optimistic check only — every page and Server Action re-verifies via requireUser().
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (session && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next();
  const issuedAt = session?.iat ?? 0;
  if (session && Date.now() / 1000 - issuedAt > REFRESH_AFTER_SECONDS) {
    response.cookies.set(SESSION_COOKIE, await signSession(session.userId), sessionCookieOptions);
  }
  return response;
}

export const config = {
  // Skip static assets, PWA files and Next internals.
  matcher: [
    "/((?!_next/static|_next/image|icons/|sw.js|manifest.webmanifest|favicon.ico|icon.svg|apple-icon.png|robots.txt).*)",
  ],
};
