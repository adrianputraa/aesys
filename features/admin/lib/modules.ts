import { KeyRoundIcon, UsersIcon, type LucideIcon } from "lucide-react"

import {
  PERMISSIONS,
  type PermissionValue,
} from "@/features/admin/lib/permissions-catalog"

/**
 * Registry of admin modules shown on the `/admin` landing page. Each module is
 * gated by a permission; the landing page only lists ones the user can access.
 */
export type AdminModule = {
  key: string
  name: string
  description: string
  href: string
  icon: LucideIcon
  permission: PermissionValue
}

export const ADMIN_MODULES: AdminModule[] = [
  {
    key: "users",
    name: "Users",
    description: "Browse, search, and manage user accounts and their sessions.",
    href: "/admin/users",
    icon: UsersIcon,
    permission: PERMISSIONS.ADMIN_PAGE_USER,
  },
  {
    key: "permissions",
    name: "Permissions",
    description:
      "View and manage which permissions are granted to each user or role.",
    href: "/admin/permissions",
    icon: KeyRoundIcon,
    permission: PERMISSIONS.ADMIN_PAGE_PERMISSION,
  },
]
