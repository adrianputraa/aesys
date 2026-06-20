import Link from "next/link"

import { DemoBadge } from "@/components/demo-badge"
import { AdminBackButton } from "@/features/admin/components/admin-back-button"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { requirePermission } from "@/features/admin/server/permissions"
import { UserMenu } from "@/features/auth/components/user-menu"

/**
 * Admin shell. `requireAdmin()` is the authoritative gate — it redirects
 * signed-out visitors to sign-in and non-admins to their profile before any
 * admin UI renders. The edge `proxy` only does an optimistic cookie check.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requirePermission(PERMISSIONS.ADMIN_PAGE)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 bg-background/80 px-4 backdrop-blur sm:px-6 print:hidden">
        <UserMenu
          align="start"
          appLinkHref="/profile"
          user={{
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
          }}
        />
        <Link
          href="/admin"
          className="flex items-center gap-2 font-heading font-semibold"
        >
          aesys
          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
            Admin
          </span>
        </Link>
        <AdminBackButton />
        <div className="ml-auto flex items-center gap-3">
          <DemoBadge />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 xl:max-w-6xl 2xl:max-w-screen-2xl">
        {children}
      </main>
    </div>
  )
}
