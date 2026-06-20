"use client"

import { authClient, useSession } from "@/lib/auth-client"

/**
 * Client-side auth helpers. Use only in Client Components — for Server
 * Components read the session via `features/auth/server/session.ts` instead.
 */
export function useAuth() {
  const { data, isPending, error } = useSession()
  return {
    user: data?.user ?? null,
    session: data?.session ?? null,
    isAuthenticated: Boolean(data?.user),
    isPending,
    error,
  }
}

export { authClient }
