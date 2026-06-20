import "server-only"

import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"

/**
 * Server-side session helpers. These are the AUTHORITATIVE auth checks — the
 * edge `proxy` only does an optimistic cookie-presence redirect, so every
 * protected Server Component / Route Handler / Server Action must still call
 * one of these (or `auth.api.getSession`) to validate the session for real.
 */

/** Returns the current `{ session, user }` or `null` when signed out. */
export async function getServerSession() {
  return auth.api.getSession({ headers: await headers() })
}

/** Returns the signed-in user, or `null` when signed out. */
export async function getCurrentUser() {
  const session = await getServerSession()
  return session?.user ?? null
}

/**
 * Returns the signed-in user, or redirects to the sign-in page (preserving the
 * attempted path as `?from=`) when signed out.
 */
export async function requireUser(fromPath?: string) {
  const session = await getServerSession()
  if (!session) {
    const target = fromPath
      ? `/sign-in?from=${encodeURIComponent(fromPath)}`
      : "/sign-in"
    redirect(target)
  }
  return session.user
}
