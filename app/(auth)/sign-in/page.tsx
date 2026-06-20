import type { Metadata } from "next"
import { CircleCheckIcon } from "lucide-react"

import { AuthCard } from "@/features/auth/components/auth-card"
import { DemoAccountPicker } from "@/features/auth/components/demo-account-picker"
import { SignInForm } from "@/features/auth/components/sign-in-form"
import { DEMO_ACCOUNTS, DEMO_PRIMARY } from "@/lib/demo"
import { env } from "@/lib/env"

export const metadata: Metadata = { title: "Sign in" }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[]; reset?: string | string[] }>
}) {
  const params = await searchParams
  const from = typeof params.from === "string" ? params.from : undefined
  const resetDone = params.reset === "success"
  const demo = env.isDemoMode

  return (
    <AuthCard
      title="Welcome back"
      description={
        demo
          ? "Demo mode — sign in with a prefilled account below."
          : "Sign in to your account to continue."
      }
      footer={
        demo ? undefined : "Need an account? Contact your administrator."
      }
    >
      {resetDone ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary"
        >
          <CircleCheckIcon className="size-4 shrink-0" />
          Password updated. Sign in with your new password.
        </div>
      ) : null}
      {demo ? <DemoAccountPicker accounts={DEMO_ACCOUNTS} /> : null}
      <SignInForm
        from={from}
        defaultEmail={demo ? DEMO_PRIMARY.email : undefined}
        defaultPassword={demo ? DEMO_PRIMARY.password : undefined}
      />
    </AuthCard>
  )
}
