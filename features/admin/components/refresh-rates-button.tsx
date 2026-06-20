"use client"

import { RefreshCwIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { refreshRatesAction } from "@/features/admin/server/currency-actions"
import { cn } from "@/lib/utils"

/** Single-click update of all currency rates from the live exchange-rate API. */
export function RefreshRatesButton({
  variant = "outline",
  size = "sm",
}: {
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
}) {
  const [pending, startTransition] = useTransition()

  function refresh() {
    startTransition(async () => {
      const result = await refreshRatesAction()
      if (result.status === "success") {
        toast.success(result.message ?? "Rates updated.")
      } else {
        toast.error(result.message ?? "Couldn't update rates.")
      }
    })
  }

  return (
    <Button variant={variant} size={size} disabled={pending} onClick={refresh}>
      <RefreshCwIcon className={cn(pending && "animate-spin")} />
      {pending ? "Updating…" : "Refresh rates"}
    </Button>
  )
}
