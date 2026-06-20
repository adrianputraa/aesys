import type { Role } from "@/lib/permissions"

/**
 * Source-of-truth catalog of application permissions. Seeded into the DB on
 * startup (idempotently, keyed by `value`). Add new permissions here.
 *
 * Resolution (see features/admin/server/permissions.ts):
 *  - SUPER_ADMIN always has every permission.
 *  - An explicit per-user grant (allow/deny) overrides everything else.
 *  - Otherwise a user inherits it if their role is at or above `baseRole`.
 */
export type PermissionDef = {
  value: string
  name: string
  description: string
  baseRole: Role
}

/** Typed permission keys for use in route/action guards. */
export const PERMISSIONS = {
  ADMIN_PAGE: "administrator.page",
  ADMIN_PAGE_USER: "administrator.page.user",
  ADMIN_PAGE_PERMISSION: "administrator.page.permission",
  CREATE_USER: "administrator.create.user",
  MODIFY_USER: "administrator.modify.user",
  PASSWORD_USER: "administrator.password.user",
  RESTRICT_USER: "administrator.restrict.user",
  SESSION_USER: "administrator.session.user",
  AVATAR_USER: "administrator.avatar.user",
  MANAGE_PERMISSION: "administrator.manage.permission",
} as const

export type PermissionValue = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const PERMISSION_CATALOG: PermissionDef[] = [
  {
    value: PERMISSIONS.ADMIN_PAGE,
    name: "Access Admin Area",
    description: "Open the administrator area (the base /admin route).",
    baseRole: "ADMIN",
  },
  {
    value: PERMISSIONS.ADMIN_PAGE_USER,
    name: "Access User Module",
    description: "Open the user management module (/admin/users).",
    baseRole: "ADMIN",
  },
  {
    value: PERMISSIONS.ADMIN_PAGE_PERMISSION,
    name: "Access Permission Module",
    description: "Open the permission management module (/admin/permissions).",
    baseRole: "ADMIN",
  },
  {
    value: PERMISSIONS.CREATE_USER,
    name: "Create Users",
    description: "Create new user accounts from the user module.",
    baseRole: "ADMIN",
  },
  {
    value: PERMISSIONS.MODIFY_USER,
    name: "Modify User Information",
    description:
      "Edit a user's name, email, role, and verification via the user module.",
    baseRole: "ADMIN",
  },
  {
    value: PERMISSIONS.PASSWORD_USER,
    name: "Set User Passwords",
    description: "Set a user's password or send them a reset link.",
    baseRole: "ADMIN",
  },
  {
    value: PERMISSIONS.RESTRICT_USER,
    name: "Restrict Users",
    description: "Restrict (ban) or lift the restriction on a user account.",
    baseRole: "ADMIN",
  },
  {
    value: PERMISSIONS.SESSION_USER,
    name: "Revoke User Sessions",
    description: "Force sign-out of a user's active sessions/devices.",
    baseRole: "ADMIN",
  },
  {
    value: PERMISSIONS.AVATAR_USER,
    name: "Modify User Avatars",
    description: "Change or remove a user's profile picture.",
    baseRole: "ADMIN",
  },
  {
    value: PERMISSIONS.MANAGE_PERMISSION,
    name: "Manage Permissions",
    description: "Grant or deny permissions to users in the permission module.",
    baseRole: "ADMIN",
  },
]
