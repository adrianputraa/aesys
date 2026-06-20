import { redirect } from "next/navigation"

import { getCurrentUser } from "@/features/auth/server/session"

/**
 * Layout for the unauthenticated auth pages (sign-in / sign-up). Already
 * signed-in users are bounced to their profile so they never see these forms.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (user) redirect("/profile")

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      {children}
    </main>
  )
}
