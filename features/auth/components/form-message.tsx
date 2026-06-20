"use client"

import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"
import * as React from "react"

import type { ActionState } from "@/features/auth/types"
import { cn } from "@/lib/utils"

/**
 * Renders the top-level (non-field) message from an `ActionState`. Uses
 * `role="alert"`/`status` so assistive tech announces it, and moves focus to
 * the message on error so keyboard users land on the problem.
 */
export function FormMessage({ state }: { state: ActionState }) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (state.status === "error") ref.current?.focus()
  }, [state])

  if (state.status === "idle" || !state.message) return null

  const isError = state.status === "error"

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none",
        isError
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary"
      )}
    >
      {isError ? (
        <CircleAlertIcon className="size-4 shrink-0" />
      ) : (
        <CircleCheckIcon className="size-4 shrink-0" />
      )}
      <span>{state.message}</span>
    </div>
  )
}
