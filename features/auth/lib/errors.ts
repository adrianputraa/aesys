import { APIError } from "better-auth/api"

import type { ActionState } from "@/features/auth/types"

/**
 * Maps better-auth error *codes* to user-facing messages. Messages are kept
 * deliberately generic for credential errors so we don't leak which accounts
 * exist (enumeration protection).
 */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Incorrect email or password.",
  INVALID_PASSWORD: "Your current password is incorrect.",
  USER_ALREADY_EXISTS: "An account with this email already exists.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "An account with this email already exists.",
  EMAIL_NOT_VERIFIED: "Please verify your email address before signing in.",
  BANNED_USER:
    "Your account is restricted. Please contact an administrator.",
  YOU_CANNOT_BAN_YOURSELF: "You can't restrict your own account.",
  INVALID_TOKEN:
    "This reset link is invalid or has expired. Please request a new one.",
  CREDENTIAL_ACCOUNT_NOT_FOUND:
    "This account has no password set. Try another sign-in method.",
  PASSWORD_TOO_SHORT: "Password is too short.",
  PASSWORD_TOO_LONG: "Password is too long.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  // Origin/CSRF failures surface as a generic message; they indicate a
  // misconfigured client or an attempted forgery, never a normal user error.
  INVALID_ORIGIN: "Your request could not be verified. Please try again.",
}

const FALLBACK = "Something went wrong. Please try again."

/** Extracts the better-auth error `code` from an unknown thrown value. */
export function errorCode(error: unknown): string | undefined {
  if (error instanceof APIError) {
    const body = error.body as { code?: string } | undefined
    return body?.code
  }
  return undefined
}

/** Turns any thrown value into a safe, user-facing message. */
export function toErrorMessage(error: unknown): string {
  const code = errorCode(error)
  if (code && MESSAGES[code]) {
    return MESSAGES[code]
  }
  // Avoid leaking raw internal error strings to the client.
  return FALLBACK
}

/** Convenience wrapper that builds an error `ActionState` from a thrown value. */
export function toErrorState(error: unknown): ActionState {
  return { status: "error", message: toErrorMessage(error) }
}
