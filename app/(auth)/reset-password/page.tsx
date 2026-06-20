import type { Metadata } from "next"
import Link from "next/link"

import { AuthCard } from "@/features/auth/components/auth-card"
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form"

export const metadata: Metadata = { title: "Reset password" }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>
}) {
  const sp = await searchParams
  const token = typeof sp.token === "string" ? sp.token : ""
  const invalid = !token || sp.error === "INVALID_TOKEN"

  return (
    <AuthCard
      title="Set a new password"
      description={
        invalid
          ? "This reset link is invalid or has expired."
          : "Choose a new password for your account."
      }
      footer={
        <Link
          href="/forgot-password"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {invalid ? "Request a new link" : "Back to forgot password"}
        </Link>
      }
    >
      {invalid ? (
        <p className="text-sm text-muted-foreground">
          Request a fresh reset link and try again.
        </p>
      ) : (
        <ResetPasswordForm token={token} />
      )}
    </AuthCard>
  )
}
