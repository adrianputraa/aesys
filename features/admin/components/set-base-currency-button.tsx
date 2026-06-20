"use client"

import { LandmarkIcon } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { ResponsiveConfirm } from "@/components/responsive-confirm"
import { Button } from "@/components/ui/button"
import { setBaseCurrencyAction } from "@/features/admin/server/currency-actions"

export function SetBaseCurrencyButton({
  publicId,
  code,
}: {
  publicId: string
  code: string
}) {
  const [pending, startTransition] = useTransition()

  function setBase() {
    startTransition(async () => {
      const result = await setBaseCurrencyAction(publicId)
      if (result.status === "success") {
        toast.success(result.message ?? "Base currency changed.")
      } else {
        toast.error(result.message ?? "Couldn't change the base currency.")
      }
    })
  }

  return (
    <ResponsiveConfirm
      trigger={
        <Button variant="outline" size="sm" disabled={pending}>
          <LandmarkIcon />
          {pending ? "Setting…" : "Set as base"}
        </Button>
      }
      title={`Make ${code} the base currency?`}
      description={
        <>
          Every currency’s rate will be recalculated relative to {code}, which
          becomes 1. This may affect item pricing, shipping, and tax
          calculations (coming soon) — review those after switching.
        </>
      }
      confirmLabel={`Set ${code} as base`}
      onConfirm={setBase}
    />
  )
}
