import { getSessionCookie } from "better-auth/cookies"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Next.js 16 `proxy` (the renamed `middleware`). Runs on the Node.js runtime.
 *
 * This is an OPTIMISTIC guard only: it checks for the presence of a session
 * cookie and redirects signed-out visitors away from protected routes so they
 * don't flash protected UI. It does NOT validate the session — `getSessionCookie`
 * only reads the cookie, it doesn't verify the token. Authoritative checks live
 * in the protected layouts/actions via `requireUser()` / `auth.api.getSession`.
 *
 * See: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("from", request.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  // Only run on protected sections. Public routes (/, /sign-in) and the auth
  // API (/api/auth/*) are intentionally excluded. `/admin` is additionally
  // gated by a role check in its layout (`requireAdmin`).
  matcher: ["/profile/:path*", "/settings/:path*", "/admin/:path*"],
}
