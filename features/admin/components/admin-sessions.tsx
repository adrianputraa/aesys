"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { LocalTime } from "@/components/local-time"
import { ResponsiveConfirm } from "@/components/responsive-confirm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { forceRevokeSessionAction } from "@/features/admin/server/actions"
import type { AdminSessionInfo } from "@/features/admin/types"
import { DeviceIcon } from "@/features/auth/components/device-icon"
import type { ActionState } from "@/features/auth/types"

function notify(result: ActionState) {
  if (result.status === "success") {
    toast.success(result.message ?? "Done.")
  } else {
    toast.error(result.message ?? "Something went wrong.")
  }
}

export function AdminSessions({
  userPublicId,
  sessions,
  canRevoke,
}: {
  userPublicId: string
  sessions: AdminSessionInfo[]
  canRevoke: boolean
}) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No active sessions.</p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {sessions.map((session) => (
        <AdminSessionRow
          key={session.publicId}
          userPublicId={userPublicId}
          session={session}
          canRevoke={canRevoke}
        />
      ))}
    </ul>
  )
}

function AdminSessionRow({
  userPublicId,
  session,
  canRevoke,
}: {
  userPublicId: string
  session: AdminSessionInfo
  canRevoke: boolean
}) {
  const [pending, startTransition] = useTransition()

  function revoke() {
    startTransition(async () => {
      notify(await forceRevokeSessionAction(userPublicId, session.publicId))
    })
  }

  return (
    <li className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
        <DeviceIcon deviceType={session.device.deviceType} />
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">
            {session.device.label}
          </span>
          {session.impersonatedBy ? (
            <Badge variant="outline" className="shrink-0">
              Impersonated
            </Badge>
          ) : null}
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {session.ipAddress ? `${session.ipAddress} · ` : ""}
          Signed in{" "}
          <LocalTime
            value={session.createdAt}
            dateStyle="medium"
            timeStyle="short"
          />
        </span>
      </div>

      <div className="ml-auto shrink-0">
        {!canRevoke ? null : (
        <ResponsiveConfirm
          trigger={
            <Button variant="destructive" size="sm" disabled={pending}>
              {pending ? "Revoking…" : "Force sign out"}
            </Button>
          }
          title="Force sign out this session?"
          description={`This immediately revokes ${session.device.label}${
            session.ipAddress ? ` (${session.ipAddress})` : ""
          }. The user will need to sign in again on that device.`}
          confirmLabel="Force sign out"
          onConfirm={revoke}
        />
        )}
      </div>
    </li>
  )
}
