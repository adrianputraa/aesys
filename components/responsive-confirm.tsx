"use client"

import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-media-query"

/**
 * A confirmation overlay that adapts to screen size per the design rules:
 * `AlertDialog` on desktop, `Drawer` on mobile. Callers pass a single `trigger`
 * and don't branch on breakpoint themselves.
 */
export function ResponsiveConfirm({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
}: {
  trigger: React.ReactNode
  title: string
  description: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = React.useState(false)

  function confirm() {
    setOpen(false)
    onConfirm()
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button onClick={confirm}>{confirmLabel}</Button>
            <DrawerClose asChild>
              <Button variant="outline">{cancelLabel}</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
