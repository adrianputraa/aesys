import Link from "next/link"

import { DemoBadge } from "@/components/demo-badge"
import { MainNav } from "@/components/main-nav"
import { UserMenu } from "@/features/auth/components/user-menu"
import { requireUser } from "@/features/auth/server/session"

/**
 * Shell for authenticated pages. `requireUser()` is the AUTHORITATIVE auth
 * gate (the edge `proxy` is only optimistic) — it redirects signed-out visitors
 * to the sign-in page before any protected content renders.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 bg-background/80 px-4 backdrop-blur sm:px-6">
        <Link href="/profile" className="font-heading font-semibold">
          aesys
        </Link>
        <DemoBadge />
        <MainNav />
        <div className="ml-auto">
          <UserMenu
            user={{
              name: user.name,
              email: user.email,
              image: user.image,
              role: user.role,
            }}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}
