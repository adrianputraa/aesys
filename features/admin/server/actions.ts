"use server"

import { and, eq, ne } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import {
  authorize,
  removeGrant,
  setGrantByEmail,
} from "@/features/admin/server/permissions"
import {
  getUserDetailByPublicId,
  resolveUserId,
} from "@/features/admin/server/users"
import { clearAvatar, storeAvatar } from "@/features/auth/server/avatar-store"
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
import {
  session as sessionTable,
  user as userTable,
} from "@/lib/db/app/auth-schema"
import { ROLES, type Role } from "@/lib/permissions"

const FORBIDDEN: ActionState = {
  status: "error",
  message: "You don't have permission to do that.",
}

function str(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

// ---------------------------------------------------------------------------
// Create a user (administrator.create.user)
// ---------------------------------------------------------------------------

export async function createUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await authorize(PERMISSIONS.CREATE_USER))) return FORBIDDEN

  const name = str(formData, "name").trim()
  const email = str(formData, "email").trim()
  const password = str(formData, "password")
  const role = str(formData, "role")

  const { fieldErrors, hasErrors } = collectErrors({
    name: validateName(name),
    email: validateEmail(email),
    password: validatePassword(password),
    role: (ROLES as readonly string[]).includes(role)
      ? undefined
      : "Select a valid role.",
  })
  if (hasErrors) {
    return { status: "error", message: "Check the fields below.", fieldErrors }
  }

  try {
    await auth.api.createUser({
      body: { email, password, name, role: role as Role },
      headers: await headers(),
    })
  } catch (error) {
    return toErrorState(error)
  }

  revalidatePath("/admin/users")
  redirect("/admin/users")
}

// ---------------------------------------------------------------------------
// Edit a user's information (administrator.modify.user)
// ---------------------------------------------------------------------------

export async function editUserAction(
  userPublicId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await authorize(PERMISSIONS.MODIFY_USER)
  if (!session) return FORBIDDEN
  if (!isUuid(userPublicId)) {
    return { status: "error", message: "Invalid user." }
  }

  const name = str(formData, "name").trim()
  const email = str(formData, "email").trim().toLowerCase()
  const role = str(formData, "role")
  const emailVerified = formData.get("emailVerified") !== null

  const { fieldErrors, hasErrors } = collectErrors({
    name: validateName(name),
    email: validateEmail(email),
    role: (ROLES as readonly string[]).includes(role)
      ? undefined
      : "Select a valid role.",
  })
  if (hasErrors) {
    return { status: "error", message: "Check the fields below.", fieldErrors }
  }

  const [target] = await db
    .select({ id: userTable.id, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.publicId, userPublicId))
    .limit(1)
  if (!target) {
    return { status: "error", message: "User not found." }
  }

  // Anti-escalation: only a super admin may touch a super admin, or grant the
  // super admin role.
  const actingIsSuper = session.user.role === "SUPER_ADMIN"
  if (
    (target.role === "SUPER_ADMIN" || role === "SUPER_ADMIN") &&
    !actingIsSuper
  ) {
    return {
      status: "error",
      message: "Only a super admin can grant or modify the super admin role.",
      fieldErrors: { role: "Not allowed." },
    }
  }

  // Email uniqueness (excluding the user being edited).
  const [clash] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(and(eq(userTable.email, email), ne(userTable.id, target.id)))
    .limit(1)
  if (clash) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: { email: "That email is already in use." },
    }
  }

  await db
    .update(userTable)
    .set({ name, email, role, emailVerified, updatedAt: new Date() })
    .where(eq(userTable.id, target.id))

  // "layout" so the header/list reflect the new name immediately.
  revalidatePath(`/admin/users/${userPublicId}`, "layout")
  revalidatePath("/admin/users")
  return { status: "success", message: "User updated." }
}

// ---------------------------------------------------------------------------
// Force-revoke a specific session of any user (administrator.session.user)
// ---------------------------------------------------------------------------

export async function forceRevokeSessionAction(
  userPublicId: string,
  sessionPublicId: string
): Promise<ActionState> {
  if (!(await authorize(PERMISSIONS.SESSION_USER))) return FORBIDDEN

  if (!isUuid(userPublicId) || !isUuid(sessionPublicId)) {
    return { status: "error", message: "Invalid request." }
  }

  const userId = await resolveUserId(userPublicId)
  if (userId == null) {
    return { status: "error", message: "User not found." }
  }

  const [row] = await db
    .select({ token: sessionTable.token })
    .from(sessionTable)
    .where(
      and(
        eq(sessionTable.publicId, sessionPublicId),
        eq(sessionTable.userId, userId)
      )
    )
    .limit(1)

  if (!row) {
    return { status: "error", message: "That session no longer exists." }
  }

  try {
    await auth.api.revokeUserSession({
      body: { sessionToken: row.token },
      headers: await headers(),
    })
  } catch (error) {
    return toErrorState(error)
  }

  revalidatePath(`/admin/users/${userPublicId}`)
  return { status: "success", message: "Session revoked." }
}

// ---------------------------------------------------------------------------
// Set a user's password (administrator.password.user)
// ---------------------------------------------------------------------------

export async function setUserPasswordAction(
  userPublicId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await authorize(PERMISSIONS.PASSWORD_USER))) return FORBIDDEN
  if (!isUuid(userPublicId)) {
    return { status: "error", message: "Invalid user." }
  }

  const newPassword = str(formData, "newPassword")
  const pwError = validatePassword(newPassword)
  if (pwError) {
    return {
      status: "error",
      message: "Check the field below.",
      fieldErrors: { newPassword: pwError },
    }
  }

  const userId = await resolveUserId(userPublicId)
  if (userId == null) {
    return { status: "error", message: "User not found." }
  }

  try {
    await auth.api.setUserPassword({
      body: { newPassword, userId: String(userId) },
      headers: await headers(),
    })
  } catch (error) {
    return toErrorState(error)
  }

  revalidatePath(`/admin/users/${userPublicId}`)
  return { status: "success", message: "Password updated." }
}

export async function sendUserPasswordResetAction(
  userPublicId: string
): Promise<ActionState> {
  if (!(await authorize(PERMISSIONS.PASSWORD_USER))) return FORBIDDEN
  if (!isUuid(userPublicId)) {
    return { status: "error", message: "Invalid user." }
  }

  const user = await getUserDetailByPublicId(userPublicId)
  if (!user) {
    return { status: "error", message: "User not found." }
  }

  try {
    await auth.api.requestPasswordReset({
      body: { email: user.email, redirectTo: "/reset-password" },
      headers: await headers(),
    })
  } catch (error) {
    return toErrorState(error)
  }

  return { status: "success", message: "Password reset email sent." }
}

// ---------------------------------------------------------------------------
// Restrict / unrestrict (administrator.restrict.user)
// ---------------------------------------------------------------------------

export async function restrictUserAction(
  userPublicId: string,
  banReason: string
): Promise<ActionState> {
  if (!(await authorize(PERMISSIONS.RESTRICT_USER))) return FORBIDDEN
  if (!isUuid(userPublicId)) {
    return { status: "error", message: "Invalid user." }
  }

  const userId = await resolveUserId(userPublicId)
  if (userId == null) {
    return { status: "error", message: "User not found." }
  }

  try {
    await auth.api.banUser({
      body: {
        userId: String(userId),
        banReason: banReason.trim() || undefined,
      },
      headers: await headers(),
    })
  } catch (error) {
    return toErrorState(error)
  }

  revalidatePath(`/admin/users/${userPublicId}`)
  return {
    status: "success",
    message: "Account restricted. All sessions were signed out.",
  }
}

export async function unrestrictUserAction(
  userPublicId: string
): Promise<ActionState> {
  if (!(await authorize(PERMISSIONS.RESTRICT_USER))) return FORBIDDEN
  if (!isUuid(userPublicId)) {
    return { status: "error", message: "Invalid user." }
  }

  const userId = await resolveUserId(userPublicId)
  if (userId == null) {
    return { status: "error", message: "User not found." }
  }

  try {
    await auth.api.unbanUser({
      body: { userId: String(userId) },
      headers: await headers(),
    })
  } catch (error) {
    return toErrorState(error)
  }

  revalidatePath(`/admin/users/${userPublicId}`)
  return { status: "success", message: "Restriction lifted." }
}

// ---------------------------------------------------------------------------
// Avatar (administrator.avatar.user)
// ---------------------------------------------------------------------------

export async function setUserAvatarAction(
  userPublicId: string,
  formData: FormData
): Promise<ActionState> {
  if (!(await authorize(PERMISSIONS.AVATAR_USER))) return FORBIDDEN
  if (!isUuid(userPublicId)) {
    return { status: "error", message: "Invalid user." }
  }

  const userId = await resolveUserId(userPublicId)
  if (userId == null) {
    return { status: "error", message: "User not found." }
  }

  const result = await storeAvatar(userPublicId, userId, formData.get("avatar"))
  if (result.status === "success") {
    revalidatePath(`/admin/users/${userPublicId}`, "layout")
  }
  return result
}

export async function removeUserAvatarAction(
  userPublicId: string
): Promise<ActionState> {
  if (!(await authorize(PERMISSIONS.AVATAR_USER))) return FORBIDDEN
  if (!isUuid(userPublicId)) {
    return { status: "error", message: "Invalid user." }
  }

  const userId = await resolveUserId(userPublicId)
  if (userId == null) {
    return { status: "error", message: "User not found." }
  }

  const result = await clearAvatar(userPublicId, userId)
  if (result.status === "success") {
    revalidatePath(`/admin/users/${userPublicId}`, "layout")
  }
  return result
}

// ---------------------------------------------------------------------------
// Permission grants (administrator.manage.permission)
// ---------------------------------------------------------------------------

export async function grantPermissionAction(
  permissionPublicId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await authorize(PERMISSIONS.MANAGE_PERMISSION)
  if (!session) return FORBIDDEN

  const email = str(formData, "email").trim()
  const effect = str(formData, "effect") === "deny" ? "deny" : "allow"

  const emailError = validateEmail(email)
  if (emailError) {
    return {
      status: "error",
      message: "Check the field below.",
      fieldErrors: { email: emailError },
    }
  }

  const result = await setGrantByEmail(
    permissionPublicId,
    email,
    effect,
    Number(session.user.id)
  )
  if (!result.ok) {
    return { status: "error", message: result.error }
  }

  revalidatePath(`/admin/permissions/${permissionPublicId}`)
  return {
    status: "success",
    message:
      effect === "allow"
        ? "Permission granted to user."
        : "Permission denied for user.",
  }
}

export async function removePermissionGrantAction(
  permissionPublicId: string,
  userPublicId: string
): Promise<ActionState> {
  const session = await authorize(PERMISSIONS.MANAGE_PERMISSION)
  if (!session) return FORBIDDEN

  const result = await removeGrant(
    permissionPublicId,
    userPublicId,
    Number(session.user.id)
  )
  if (!result.ok) {
    return { status: "error", message: result.error }
  }

  revalidatePath(`/admin/permissions/${permissionPublicId}`)
  return { status: "success", message: "Grant removed." }
}
