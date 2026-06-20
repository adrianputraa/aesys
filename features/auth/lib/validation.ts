/**
 * Lightweight, dependency-free input validation shared by the sign-in/sign-up
 * forms and their Server Actions. Server Actions re-run these on the server —
 * never trust client-side validation alone.
 */

import type { FieldErrors } from "@/features/auth/types"

/** Mirror better-auth's configured password bounds (see `lib/auth.ts`). */
export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128
export const MAX_NAME_LENGTH = 128
export const MAX_EMAIL_LENGTH = 254

// Pragmatic email shape check (full RFC 5322 validation is neither feasible nor
// useful here — deliverability is what actually matters). Kept intentionally
// simple: a single @, non-empty local and domain parts, a dot in the domain.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(value: string): string | undefined {
  const email = value.trim()
  if (!email) return "Email is required."
  if (email.length > MAX_EMAIL_LENGTH) return "Email is too long."
  if (!EMAIL_RE.test(email)) return "Enter a valid email address."
  return undefined
}

export function validatePassword(value: string): string | undefined {
  if (!value) return "Password is required."
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`
  }
  return undefined
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Guards a client-supplied public id before it reaches a uuid DB column. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

export function validateName(value: string): string | undefined {
  const name = value.trim()
  if (!name) return "Name is required."
  if (name.length > MAX_NAME_LENGTH) return "Name is too long."
  return undefined
}

/** Drops `undefined` entries and reports whether any field failed. */
export function collectErrors(errors: FieldErrors): {
  fieldErrors: FieldErrors
  hasErrors: boolean
} {
  const fieldErrors: FieldErrors = {}
  for (const [key, message] of Object.entries(errors)) {
    if (message) fieldErrors[key] = message
  }
  return { fieldErrors, hasErrors: Object.keys(fieldErrors).length > 0 }
}
