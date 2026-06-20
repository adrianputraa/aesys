import "server-only"

import { and, count, eq } from "drizzle-orm"
import { redirect } from "next/navigation"

import { userHasPermission } from "@/features/admin/server/permission-check"
import { getServerSession } from "@/features/auth/server/session"
import { isUuid } from "@/features/auth/lib/validation"
import { permission, permissionUser } from "@/features/admin/schema"
import { db } from "@/lib/db/app"
import { user as userTable } from "@/lib/db/app/auth-schema"

// Re-export so existing callers keep importing from this module.
export { userHasPermission }

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/** Returns the session if the user holds `value`, else null (for actions). */
export async function authorize(value: string) {
  const session = await getServerSession()
  if (!session) return null
  const ok = await userHasPermission(
    Number(session.user.id),
    session.user.role,
    value
  )
  return ok ? session : null
}

/**
 * Page guard: redirects signed-out users to sign-in and users lacking `value`
 * to `redirectTo`. Returns the session user on success.
 */
export async function requirePermission(value: string, redirectTo = "/profile") {
  const session = await getServerSession()
  if (!session) redirect("/sign-in?from=/admin")
  const ok = await userHasPermission(
    Number(session.user.id),
    session.user.role,
    value
  )
  if (!ok) redirect(redirectTo)
  return session.user
}

// ---------------------------------------------------------------------------
// Reads (permission module)
// ---------------------------------------------------------------------------

export type PermissionListItem = {
  publicId: string
  name: string
  description: string
  value: string
  baseRole: string
  allowCount: number
  denyCount: number
  updatedAt: string
}

export async function listPermissions(): Promise<PermissionListItem[]> {
  const perms = await db.select().from(permission).orderBy(permission.value)

  const counts = await db
    .select({
      permissionId: permissionUser.permissionId,
      effect: permissionUser.effect,
      total: count(),
    })
    .from(permissionUser)
    .groupBy(permissionUser.permissionId, permissionUser.effect)

  const byId = new Map<number, { allow: number; deny: number }>()
  for (const row of counts) {
    const entry = byId.get(row.permissionId) ?? { allow: 0, deny: 0 }
    if (row.effect === "allow") entry.allow = row.total
    else if (row.effect === "deny") entry.deny = row.total
    byId.set(row.permissionId, entry)
  }

  return perms.map((p) => ({
    publicId: p.publicId,
    name: p.name,
    description: p.description,
    value: p.value,
    baseRole: p.baseRole,
    allowCount: byId.get(p.id)?.allow ?? 0,
    denyCount: byId.get(p.id)?.deny ?? 0,
    updatedAt: p.updatedAt.toISOString(),
  }))
}

export type GrantUser = {
  publicId: string
  name: string
  email: string
  role: string | null
}

export type PermissionDetail = {
  publicId: string
  name: string
  description: string
  value: string
  baseRole: string
  createdAt: string
  updatedAt: string
  lastUpdatedBy: { name: string; email: string } | null
  allowed: GrantUser[]
  denied: GrantUser[]
}

export async function getPermissionDetailByPublicId(
  publicId: string
): Promise<PermissionDetail | null> {
  if (!isUuid(publicId)) return null

  const [perm] = await db
    .select()
    .from(permission)
    .where(eq(permission.publicId, publicId))
    .limit(1)
  if (!perm) return null

  const grants = await db
    .select({
      effect: permissionUser.effect,
      publicId: userTable.publicId,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
    })
    .from(permissionUser)
    .innerJoin(userTable, eq(permissionUser.userId, userTable.id))
    .where(eq(permissionUser.permissionId, perm.id))
    .orderBy(userTable.name)

  let lastUpdatedBy: { name: string; email: string } | null = null
  if (perm.lastUpdatedBy != null) {
    const [u] = await db
      .select({ name: userTable.name, email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, perm.lastUpdatedBy))
      .limit(1)
    lastUpdatedBy = u ?? null
  }

  const toUser = (g: (typeof grants)[number]): GrantUser => ({
    publicId: g.publicId,
    name: g.name,
    email: g.email,
    role: g.role,
  })

  return {
    publicId: perm.publicId,
    name: perm.name,
    description: perm.description,
    value: perm.value,
    baseRole: perm.baseRole,
    createdAt: perm.createdAt.toISOString(),
    updatedAt: perm.updatedAt.toISOString(),
    lastUpdatedBy,
    allowed: grants.filter((g) => g.effect === "allow").map(toUser),
    denied: grants.filter((g) => g.effect === "deny").map(toUser),
  }
}

/** Users whose role inherits a permission with the given base role. */
export async function listUsersByRole(role: string): Promise<GrantUser[]> {
  return db
    .select({
      publicId: userTable.publicId,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
    })
    .from(userTable)
    .where(eq(userTable.role, role))
    .orderBy(userTable.name)
}

// ---------------------------------------------------------------------------
// Mutations (permission module) — callers must authorize first
// ---------------------------------------------------------------------------

type MutationResult = { ok: true } | { ok: false; error: string }

/** Adds or updates an explicit grant for a user (identified by email). */
export async function setGrantByEmail(
  permissionPublicId: string,
  email: string,
  effect: "allow" | "deny",
  actingUserId: number
): Promise<MutationResult> {
  if (!isUuid(permissionPublicId)) return { ok: false, error: "Invalid permission." }

  const [perm] = await db
    .select({ id: permission.id })
    .from(permission)
    .where(eq(permission.publicId, permissionPublicId))
    .limit(1)
  if (!perm) return { ok: false, error: "Permission not found." }

  const [target] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email.trim().toLowerCase()))
    .limit(1)
  if (!target) return { ok: false, error: "No user with that email." }

  const now = new Date()
  await db
    .insert(permissionUser)
    .values({
      permissionId: perm.id,
      userId: target.id,
      effect,
      lastUpdatedBy: actingUserId,
    })
    .onConflictDoUpdate({
      target: [permissionUser.permissionId, permissionUser.userId],
      set: { effect, lastUpdatedBy: actingUserId, updatedAt: now },
    })

  await db
    .update(permission)
    .set({ lastUpdatedBy: actingUserId, updatedAt: now })
    .where(eq(permission.id, perm.id))

  return { ok: true }
}

/** Removes an explicit grant for a user (reverting to role inheritance). */
export async function removeGrant(
  permissionPublicId: string,
  userPublicId: string,
  actingUserId: number
): Promise<MutationResult> {
  if (!isUuid(permissionPublicId) || !isUuid(userPublicId)) {
    return { ok: false, error: "Invalid request." }
  }

  const [perm] = await db
    .select({ id: permission.id })
    .from(permission)
    .where(eq(permission.publicId, permissionPublicId))
    .limit(1)
  if (!perm) return { ok: false, error: "Permission not found." }

  const [target] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.publicId, userPublicId))
    .limit(1)
  if (!target) return { ok: false, error: "User not found." }

  await db
    .delete(permissionUser)
    .where(
      and(
        eq(permissionUser.permissionId, perm.id),
        eq(permissionUser.userId, target.id)
      )
    )

  await db
    .update(permission)
    .set({ lastUpdatedBy: actingUserId, updatedAt: new Date() })
    .where(eq(permission.id, perm.id))

  return { ok: true }
}
