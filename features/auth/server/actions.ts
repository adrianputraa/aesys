"use server"

import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { toErrorState } from "@/features/auth/lib/errors"
import {
  collectErrors,
  isUuid,
  validateEmail,
  validateName,
  validatePassword,
} from "@/features/auth/lib/validation"
import type { ActionState } from "@/features/auth/types"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db/app"
import { session as sessionTable } from "@/lib/db/app/auth-schema"

const DEFAULT_LANDING = "/profile"

/**
 * Validates a post-auth redirect target. Only same-origin absolute paths are
 * allowed: it must start with a single "/" and contain no control chars,
 * whitespace, or backslashes — all of which a browser may strip/normalise to
 * turn e.g. "/\t//evil.com" into a protocol-relative "//evil.com". This closes
 * open-redirect vectors from a tampered `from` param.
 */
function safeRedirectPath(input: FormDataEntryValue | null): string {
  if (typeof input !== "string" || !input) return DEFAULT_LANDING
  if (!input.startsWith("/") || input.startsWith("//")) return DEFAULT_LANDING
  for (const ch of input) {
    const code = ch.charCodeAt(0)
    if (code <= 0x20 || code === 0x7f || ch === "\\") return DEFAULT_LANDING
  }
  return input
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

// ---------------------------------------------------------------------------
// Sign in
// ---------------------------------------------------------------------------

export async function signInAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = str(formData, "email").trim()
  const password = str(formData, "password")
  const rememberMe = formData.get("rememberMe") !== null
  const target = safeRedirectPath(formData.get("from"))

  const { fieldErrors, hasErrors } = collectErrors({
    email: validateEmail(email),
    password: password ? undefined : "Password is required.",
  })
  if (hasErrors) {
    return { status: "error", message: "Check the fields below.", fieldErrors }
  }

  try {
    await auth.api.signInEmail({
      body: { email, password, rememberMe },
      headers: await headers(),
    })
  } catch (error) {
    return toErrorState(error)
  }

  // `redirect` throws NEXT_REDIRECT — must sit OUTSIDE the try/catch above.
  redirect(target)
}

// ---------------------------------------------------------------------------
// Sign out (current device)
// ---------------------------------------------------------------------------

export async function signOutAction(): Promise<void> {
  try {
    await auth.api.signOut({ headers: await headers() })
  } catch {
    // Already signed out / session gone — clearing the cookie is best-effort.
  }
  redirect("/sign-in")
}

// ---------------------------------------------------------------------------
// Update profile (name)
// ---------------------------------------------------------------------------

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = str(formData, "name").trim()

  const { fieldErrors, hasErrors } = collectErrors({ name: validateName(name) })
  if (hasErrors) {
    return { status: "error", message: "Check the fields below.", fieldErrors }
  }

  try {
    await auth.api.updateUser({ body: { name }, headers: await headers() })
  } catch (error) {
    return toErrorState(error)
  }

  // "layout" so the app header (which shows the user's name) also refreshes.
  revalidatePath("/profile", "layout")
  revalidatePath("/settings")
  return { status: "success", message: "Profile updated." }
}

// ---------------------------------------------------------------------------
// Change password
// ---------------------------------------------------------------------------

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const currentPassword = str(formData, "currentPassword")
  const newPassword = str(formData, "newPassword")
  const confirmPassword = str(formData, "confirmPassword")
  // Checkbox is checked by default — changing your password signs out other
  // devices unless the user explicitly opts to keep them.
  const revokeOtherSessions = formData.get("revokeOtherSessions") !== null

  const { fieldErrors, hasErrors } = collectErrors({
    currentPassword: currentPassword
      ? undefined
      : "Enter your current password.",
    newPassword: validatePassword(newPassword),
    confirmPassword:
      newPassword !== confirmPassword ? "Passwords do not match." : undefined,
  })
  if (hasErrors) {
    return { status: "error", message: "Check the fields below.", fieldErrors }
  }

  try {
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions },
      headers: await headers(),
    })
  } catch (error) {
    return toErrorState(error)
  }

  revalidatePath("/settings")
  return {
    status: "success",
    message: revokeOtherSessions
      ? "Password changed. Other devices were signed out."
      : "Password changed.",
  }
}

// ---------------------------------------------------------------------------
// Revoke a single session (by public id, resolved to a token server-side)
// ---------------------------------------------------------------------------

export async function revokeSessionAction(
  sessionPublicId: string
): Promise<ActionState> {
  if (!isUuid(sessionPublicId)) {
    return { status: "error", message: "Invalid session." }
  }

  const hdrs = await headers()
  const current = await auth.api.getSession({ headers: hdrs })
  if (!current) {
    return { status: "error", message: "You are not signed in." }
  }

  // Resolve publicId -> token, scoped to the current user. A session belonging
  // to another user is never even fetched (defense-in-depth IDOR protection).
  const [row] = await db
    .select({ token: sessionTable.token })
    .from(sessionTable)
    .where(
      and(
        eq(sessionTable.publicId, sessionPublicId),
        eq(sessionTable.userId, Number(current.user.id))
      )
    )
    .limit(1)

  if (!row) {
    return { status: "error", message: "That session no longer exists." }
  }

  try {
    await auth.api.revokeSession({ body: { token: row.token }, headers: hdrs })
  } catch (error) {
    return toErrorState(error)
  }

  revalidatePath("/settings")
  return { status: "success", message: "Signed out that device." }
}

// ---------------------------------------------------------------------------
// Revoke every OTHER session (keep the current device signed in)
// ---------------------------------------------------------------------------

export async function revokeOtherSessionsAction(): Promise<ActionState> {
  try {
    await auth.api.revokeOtherSessions({ headers: await headers() })
  } catch (error) {
    return toErrorState(error)
  }

  revalidatePath("/settings")
  return { status: "success", message: "Signed out all other devices." }
}

// ---------------------------------------------------------------------------
// Forgot password — request a reset email (anti-enumeration)
// ---------------------------------------------------------------------------

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = str(formData, "email").trim()

  const emailError = validateEmail(email)
  if (emailError) {
    return {
      status: "error",
      message: "Check the field below.",
      fieldErrors: { email: emailError },
    }
  }

  try {
    await auth.api.requestPasswordReset({
      // The email link routes back here; "/reset-password" receives `?token=`.
      body: { email, redirectTo: "/reset-password" },
      headers: await headers(),
    })
  } catch {
    // Swallow errors so we never reveal whether an account exists.
  }

  // Always the same response, account or not (enumeration protection).
  return {
    status: "success",
    message:
      "If an account exists for that email, we've sent a password reset link.",
  }
}

// ---------------------------------------------------------------------------
// Reset password — set a new password from the emailed token
// ---------------------------------------------------------------------------

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = str(formData, "token")
  const newPassword = str(formData, "newPassword")
  const confirmPassword = str(formData, "confirmPassword")

  if (!token) {
    return {
      status: "error",
      message:
        "This reset link is invalid or has expired. Please request a new one.",
    }
  }

  const { fieldErrors, hasErrors } = collectErrors({
    newPassword: validatePassword(newPassword),
    confirmPassword:
      newPassword !== confirmPassword ? "Passwords do not match." : undefined,
  })
  if (hasErrors) {
    return { status: "error", message: "Check the fields below.", fieldErrors }
  }

  try {
    await auth.api.resetPassword({
      body: { newPassword, token },
      headers: await headers(),
    })
  } catch (error) {
    return toErrorState(error)
  }

  // All sessions were revoked (revokeSessionsOnPasswordReset); send them to sign in.
  redirect("/sign-in?reset=success")
}
