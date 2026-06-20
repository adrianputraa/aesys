"use client"

import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { LocalTime } from "@/components/local-time"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ORDER_STAGES, stagesFor } from "@/features/sales/lib/stages"
import {
  advanceOrderStatusAction,
  setOrderStatusAction,
} from "@/features/sales/server/order-actions"
import type { OrderEventInfo } from "@/features/sales/server/orders"
import { cn } from "@/lib/utils"

export function OrderTimeline({
  orderPublicId,
  status,
  isInternational,
  timeline,
  canManage,
}: {
  orderPublicId: string
  status: string
  isInternational: boolean
  timeline: OrderEventInfo[]
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [manualStage, setManualStage] = React.useState(status)
  const [note, setNote] = React.useState("")

  const stages = stagesFor(isInternational)
  const currentIndex = stages.findIndex((s) => s.key === status)
  const atEnd = currentIndex === stages.length - 1

  // Latest reached-time per stage key (from status events).
  const reachedAt = new Map<string, string>()
  for (const e of timeline) {
    if (e.status) reachedAt.set(e.status, e.createdAt)
  }

  function advance() {
    startTransition(async () => {
      const r = await advanceOrderStatusAction(orderPublicId)
      if (r.status === "success") {
        toast.success("Order advanced.")
        router.refresh()
      } else toast.error(r.message)
    })
  }

  function setStage() {
    startTransition(async () => {
      const r = await setOrderStatusAction(orderPublicId, manualStage, note)
      if (r.status === "success") {
        toast.success("Stage updated.")
        setNote("")
        router.refresh()
      } else toast.error(r.message)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col">
        {stages.map((stage, i) => {
          const reached = i <= currentIndex || reachedAt.has(stage.key)
          const isCurrent = stage.key === status
          const ts = reachedAt.get(stage.key)
          return (
            <li key={stage.key} className="flex gap-3 pb-3 last:pb-0">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full",
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : reached
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {reached ? (
                    <CheckIcon className="size-3.5" />
                  ) : (
                    <CircleIcon className="size-2.5" />
                  )}
                </span>
                {i < stages.length - 1 ? (
                  <span
                    className={cn(
                      "mt-1 w-px flex-1",
                      reached ? "bg-primary/30" : "bg-border"
                    )}
                  />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-col pb-1">
                <span
                  className={cn(
                    "text-sm",
                    isCurrent
                      ? "font-semibold"
                      : reached
                        ? ""
                        : "text-muted-foreground"
                  )}
                >
                  {stage.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ts ? (
                    <LocalTime
                      value={ts}
                      dateStyle="medium"
                      timeStyle="short"
                    />
                  ) : (
                    stage.description
                  )}
                </span>
              </div>
            </li>
          )
        })}
      </ol>

      {canManage ? (
        <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
          <Button
            type="button"
            onClick={advance}
            disabled={pending || atEnd}
            className="w-fit"
          >
            <ChevronRightIcon />
            {atEnd ? "At final stage" : "Advance to next stage"}
          </Button>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">
              Or set a stage manually (with an optional note):
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={manualStage} onValueChange={setManualStage}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STAGES.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {s.label}
                      {s.internationalOnly ? " (international)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={note}
                placeholder="Note (optional)"
                onChange={(e) => setNote(e.target.value)}
                className="w-48"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={setStage}
                disabled={pending}
              >
                Set stage
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
