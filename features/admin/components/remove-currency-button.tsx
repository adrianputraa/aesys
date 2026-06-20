"use client"

import { Trash2Icon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { ResponsiveConfirm } from "@/components/responsive-confirm"
import { Button } from "@/components/ui/button"
import { removeCurrencyAction } from "@/features/admin/server/currency-actions"

export function RemoveCurrencyButton({
  publicId,
  code,
}: {
  publicId: string
  code: string
}) {
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      // On success the action redirects to the list; only errors return here.
      const result = await removeCurrencyAction(publicId)
      if (result.status === "error") {
        toast.error(result.message ?? "Couldn't remove the currency.")
      }
    })
  }

  return (
    <ResponsiveConfirm
      trigger={
        <Button variant="destructive" size="sm" disabled={pending}>
          <Trash2Icon />
          {pending ? "Removing…" : "Remove"}
        </Button>
      }
      title={`Remove ${code}?`}
      description="This permanently deletes the currency and all of its rate history."
      confirmLabel="Remove currency"
      onConfirm={remove}
    />
  )
}
