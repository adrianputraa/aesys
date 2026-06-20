"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { formatRate, formatRateCompact } from "@/features/admin/lib/fx"
import { cn } from "@/lib/utils"

type DecimalsContextValue = { showMore: boolean; toggle: () => void }

const DecimalsContext = React.createContext<DecimalsContextValue | null>(null)

/**
 * Shares one "More decimals" preference across all `<RateValue>`s in a region.
 * It's a client provider, but its children may be server-rendered — the nested
 * `<RateValue>` client components still read the context.
 */
export function DecimalsProvider({ children }: { children: React.ReactNode }) {
  const [showMore, setShowMore] = React.useState(false)
  const value = React.useMemo(
    () => ({ showMore, toggle: () => setShowMore((v) => !v) }),
    [showMore]
  )
  return (
    <DecimalsContext.Provider value={value}>
      {children}
    </DecimalsContext.Provider>
  )
}

/** Toggles full-precision rates for the whole list. */
export function DecimalsToggle({ className }: { className?: string }) {
  const ctx = React.useContext(DecimalsContext)
  if (!ctx) return null
  return (
    <Button
      type="button"
      variant={ctx.showMore ? "secondary" : "outline"}
      size="sm"
      aria-pressed={ctx.showMore}
      onClick={ctx.toggle}
      className={className}
    >
      More decimals
    </Button>
  )
}

/**
 * A currency rate shown compactly (0 or 3 decimals) by default, revealing full
 * precision on hover or when "More decimals" is on. Hydration-safe: both the
 * server and the first client render show the compact form.
 */
export function RateValue({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const ctx = React.useContext(DecimalsContext)
  const [hover, setHover] = React.useState(false)
  const full = (ctx?.showMore ?? false) || hover

  return (
    <span
      className={cn("tabular-nums", className)}
      title={formatRate(value)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {full ? formatRate(value) : formatRateCompact(value)}
    </span>
  )
}
