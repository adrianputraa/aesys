"use client"

import { UsersIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import type { GrantUser } from "@/features/admin/server/permissions"
import { useIsMobile } from "@/hooks/use-media-query"

/**
 * Clickable base-role chip that opens a list of users who inherit a permission
 * through that role. Dialog on desktop, Drawer on mobile.
 */
export function RoleUsersDialog({
  role,
  users,
}: {
  role: string
  users: GrantUser[]
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)

  const trigger = (
    <Button variant="outline" size="sm">
      <UsersIcon />
      {role} ({users.length})
    </Button>
  )

  const title = `Users with role ${role}`
  const description = "These users inherit this permission via their role."
  const list = (
    <ul className="flex flex-col gap-1">
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No users have this role.
        </p>
      ) : (
        users.map((u) => (
          <li
            key={u.publicId}
            className="flex flex-col rounded-md px-2 py-1.5 hover:bg-muted/40"
          >
            <span className="truncate text-sm font-medium">{u.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {u.email}
            </span>
          </li>
        ))
      )}
    </ul>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="max-h-[60vh] overflow-y-auto px-4 pb-4">{list}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">{list}</div>
      </DialogContent>
    </Dialog>
  )
}
