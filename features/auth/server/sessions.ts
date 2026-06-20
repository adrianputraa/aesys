import "server-only"

import { headers } from "next/headers"

import { parseUserAgent } from "@/features/auth/lib/user-agent"
import type { SessionInfo } from "@/features/auth/types"
import { auth } from "@/lib/auth"

/**
 * Lists the current user's active sessions for the device manager, shaped for
 * the client (no bearer tokens, no internal id). The current session is flagged
 * and sorted first; remaining sessions are ordered most-recent-first.
 *
 * `listSessions` is normally gated by better-auth's freshness check; we disable
 * it via `session.freshAge = 0` (see lib/auth.ts). The try/catch is defense in
 * depth so a transient/freshness error can never crash the settings page.
 */
export async function listUserSessions(): Promise<SessionInfo[]> {
  const hdrs = await headers()

  const current = await auth.api.getSession({ headers: hdrs })
  if (!current) return []

  try {
    const sessions = await auth.api.listSessions({ headers: hdrs })
    const currentToken = current.session.token

    return sessions
      .map((session) => ({
        publicId: session.publicId,
        isCurrent: session.token === currentToken,
        ipAddress: session.ipAddress ?? null,
        createdAt: new Date(session.createdAt).toISOString(),
        expiresAt: new Date(session.expiresAt).toISOString(),
        device: parseUserAgent(session.userAgent),
      }))
      .sort((a, b) => {
        if (a.isCurrent) return -1
        if (b.isCurrent) return 1
        return b.createdAt.localeCompare(a.createdAt)
      })
  } catch {
    return []
  }
}
