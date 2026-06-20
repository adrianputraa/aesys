import { createAuthClient } from "better-auth/react"

/**
 * Browser auth client. Safe to import from Client Components.
 *
 * `baseURL` is inferred from the current origin when omitted; set
 * `NEXT_PUBLIC_APP_URL` only if the API lives on a different origin.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
})

export const { signIn, signUp, signOut, useSession, getSession } = authClient
