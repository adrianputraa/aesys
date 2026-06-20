import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements } from "better-auth/plugins/admin/access"

/**
 * Role-based access control, shared by the better-auth server instance
 * (`lib/auth.ts`) and the browser client (`lib/auth-client.ts`). Keep this file
 * free of server-only imports — both bundles import it.
 *
 * `defaultStatements` is the admin plugin's permission surface:
 *   user:    create | list | set-role | ban | impersonate | impersonate-admins
 *            | delete | set-password | set-email | get | update
 *   session: list | revoke | delete
 */
export const ROLES = [
  "GUEST",
  "CUSTOMER",
  "MERCHANT",
  "STAFF",
  "ADMIN",
  "SUPER_ADMIN",
] as const

export type Role = (typeof ROLES)[number]

/** Roles the admin plugin treats as administrators (can reach /admin/* APIs). */
export const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const satisfies Role[]

export function isAdminRole(role: string | null | undefined): boolean {
  return role != null && (ADMIN_ROLES as readonly string[]).includes(role)
}

export const statement = { ...defaultStatements } as const

export const ac = createAccessControl(statement)

// Permission map per role. Only ADMIN and SUPER_ADMIN hold admin permissions;
// all other roles get NONE, so they cannot reach the admin UI *or* the
// better-auth `/api/auth/admin/*` endpoints. SUPER_ADMIN additionally may
// impersonate other admins.
export const roles = {
  GUEST: ac.newRole({ user: [], session: [] }),
  CUSTOMER: ac.newRole({ user: [], session: [] }),
  MERCHANT: ac.newRole({ user: [], session: [] }),
  STAFF: ac.newRole({ user: [], session: [] }),
  ADMIN: ac.newRole({
    user: [
      "create",
      "list",
      "set-role",
      "ban",
      "impersonate",
      "delete",
      "set-password",
      "set-email",
      "get",
      "update",
    ],
    session: ["list", "revoke", "delete"],
  }),
  SUPER_ADMIN: ac.newRole({
    user: [
      "create",
      "list",
      "set-role",
      "ban",
      "impersonate",
      "impersonate-admins",
      "delete",
      "set-password",
      "set-email",
      "get",
      "update",
    ],
    session: ["list", "revoke", "delete"],
  }),
} as const

/** Role assigned to a user when none is specified (admin-created users override this). */
export const DEFAULT_ROLE: Role = "CUSTOMER"
