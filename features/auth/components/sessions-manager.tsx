"use client"

import { LogOutIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LocalTime } from "@/components/local-time"
import { ResponsiveConfirm } from "@/components/responsive-confirm"
import { DeviceIcon } from "@/features/auth/components/device-icon"
import {
  revokeOtherSessionsAction,
  revokeSessionAction,
} from "@/features/auth/server/actions"
import type { ActionState, SessionInfo } from "@/features/auth/types"

function notify(result: ActionState) {
  if (result.status === "success") {
    toast.success(result.message ?? "Done.")
  } else {
    toast.error(result.message ?? "Something went wrong.")
  }
}

export function SessionsManager({ sessions }: { sessions: SessionInfo[] }) {
  const hasOtherSessions = sessions.some((s) => !s.isCurrent)

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No active sessions found.</p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {sessions.map((session) => (
          <SessionRow key={session.publicId} session={session} />
        ))}
      </ul>

      {hasOtherSessions ? <RevokeOthersButton /> : null}
    </div>
  )
}

function SessionRow({ session }: { session: SessionInfo }) {
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
          {session.isCurrent ? (
            <Badge variant="secondary" className="shrink-0">
              This device
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
        {session.isCurrent ? null : <RevokeSessionButton session={session} />}
      </div>
    </li>
  )
}

function RevokeSessionButton({ session }: { session: SessionInfo }) {
  const [pending, startTransition] = useTransition()

  function revoke() {
    startTransition(async () => {
      notify(await revokeSessionAction(session.publicId))
    })
  }

  return (
    <ResponsiveConfirm
      trigger={
        <Button variant="destructive" size="sm" disabled={pending}>
          {pending ? "Signing out…" : "Revoke"}
        </Button>
      }
      title="Sign out this device?"
      description={`${session.device.label} will be signed out immediately and will need to sign in again.`}
      confirmLabel="Sign out device"
      onConfirm={revoke}
    />
  )
}

function RevokeOthersButton() {
  const [pending, startTransition] = useTransition()

  function revokeOthers() {
    startTransition(async () => {
      notify(await revokeOtherSessionsAction())
    })
  }

  return (
    <ResponsiveConfirm
      trigger={
        <Button variant="outline" size="sm" disabled={pending}>
          <LogOutIcon />
          {pending ? "Signing out…" : "Log out other devices"}
        </Button>
      }
      title="Log out all other devices?"
      description="Every session except this one will be signed out. This is a good idea if you've lost a device or suspect unauthorized access."
      confirmLabel="Log out other devices"
      onConfirm={revokeOthers}
    />
  )
}
