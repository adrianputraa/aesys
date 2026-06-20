import {
  BoxesIcon,
  CoinsIcon,
  KeyRoundIcon,
  ReceiptTextIcon,
  TruckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

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
  {
    key: "currency",
    name: "Currency",
    description:
      "Manage currencies and exchange rates for item pricing across currencies.",
    href: "/admin/currency",
    icon: CoinsIcon,
    permission: PERMISSIONS.ADMIN_PAGE_CURRENCY,
  },
  {
    key: "inventory",
    name: "Inventory",
    description:
      "Track items, stock, pricing, and categories with a live inventory dashboard.",
    href: "/admin/inventory",
    icon: BoxesIcon,
    permission: PERMISSIONS.ADMIN_PAGE_INVENTORY,
  },
  {
    key: "shipping",
    name: "Shipping",
    description:
      "Register forwarders and their shipping plans, rates, and delivery timelines.",
    href: "/admin/shipping",
    icon: TruckIcon,
    permission: PERMISSIONS.ADMIN_PAGE_SHIPPING,
  },
  {
    key: "sales",
    name: "Sales",
    description:
      "Create orders, track their timeline, modify with history, and issue invoices.",
    href: "/admin/sales",
    icon: ReceiptTextIcon,
    permission: PERMISSIONS.ADMIN_PAGE_SALES,
  },
]
