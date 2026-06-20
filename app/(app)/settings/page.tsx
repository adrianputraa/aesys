import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChangePasswordForm } from "@/features/auth/components/change-password-form"
import { SessionsManager } from "@/features/auth/components/sessions-manager"
import { requireUser } from "@/features/auth/server/session"
import { listUserSessions } from "@/features/auth/server/sessions"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage() {
  // Authoritative gate (proxy is only optimistic).
  await requireUser()
  const sessions = await listUserSessions()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your password and active sessions."
      />

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Choose a strong password you don&apos;t use anywhere else.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>
            Devices and browsers signed in to your account. Revoke any you don&apos;t
            recognize.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsManager sessions={sessions} />
        </CardContent>
      </Card>
    </div>
  )
}
