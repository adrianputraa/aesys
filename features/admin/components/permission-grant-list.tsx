"use client"

import { XIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { RoleBadge } from "@/features/admin/components/role-badge"
import { removePermissionGrantAction } from "@/features/admin/server/actions"
import type { GrantUser } from "@/features/admin/server/permissions"

export function PermissionGrantList({
  permissionPublicId,
  users,
  canManage,
}: {
  permissionPublicId: string
  users: GrantUser[]
  canManage: boolean
}) {
  const [pending, startTransition] = useTransition()

  function remove(userPublicId: string) {
    startTransition(async () => {
      const result = await removePermissionGrantAction(
        permissionPublicId,
        userPublicId
      )
      if (result.status === "success") {
        toast.success(result.message ?? "Grant removed.")
      } else {
        toast.error(result.message ?? "Couldn't remove the grant.")
      }
    })
  }

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">None.</p>
  }

  return (
    <ul className="flex flex-col gap-2">
      {users.map((u) => (
        <li
          key={u.publicId}
          className="flex items-center gap-3 rounded-lg bg-muted/40 p-2.5"
        >
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{u.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {u.email}
            </span>
          </div>
          <RoleBadge role={u.role} />
          {canManage ? (
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pending}
              onClick={() => remove(u.publicId)}
              aria-label={`Remove ${u.name}`}
            >
              <XIcon />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
