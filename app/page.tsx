import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/features/auth/server/session"

export default async function Page() {
  const user = await getCurrentUser()

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="flex max-w-md flex-col gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          aesys
        </h1>
        <p className="text-muted-foreground">
          A minimal, secure starting point with email &amp; password
          authentication, profiles, and per-device session management.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button asChild>
          <Link href={user ? "/profile" : "/sign-in"}>
            {user ? "Go to your account" : "Sign in"}
          </Link>
        </Button>
      </div>
    </main>
  )
}
