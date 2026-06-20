import "server-only"

import { and, eq } from "drizzle-orm"

import { permission, permissionUser } from "@/features/admin/schema"
import { db } from "@/lib/db/app"
import { ROLES } from "@/lib/permissions"

/**
 * Pure permission resolution (no Next.js dependencies, so it's unit-testable).
 * The route/action guards live in `permissions.ts`.
 */

const SUPER_ADMIN = "SUPER_ADMIN"

function roleLevel(role: string | null | undefined): number {
  return role ? (ROLES as readonly string[]).indexOf(role) : -1
}

/**
 * Resolves whether a user holds a permission:
 *  1. SUPER_ADMIN holds everything.
 *  2. An explicit per-user grant (allow/deny) wins.
 *  3. Otherwise it's inherited when the user's role is at/above `baseRole`.
 */
export async function userHasPermission(
  userId: number,
  role: string | null | undefined,
  value: string
): Promise<boolean> {
  if (role === SUPER_ADMIN) return true

  const [perm] = await db
    .select({ id: permission.id, baseRole: permission.baseRole })
    .from(permission)
    .where(eq(permission.value, value))
    .limit(1)
  if (!perm) return false // unknown permission → deny

  const [grant] = await db
    .select({ effect: permissionUser.effect })
    .from(permissionUser)
    .where(
      and(
        eq(permissionUser.permissionId, perm.id),
        eq(permissionUser.userId, userId)
      )
    )
    .limit(1)
  if (grant) return grant.effect === "allow"

  return roleLevel(role) >= roleLevel(perm.baseRole)
}
