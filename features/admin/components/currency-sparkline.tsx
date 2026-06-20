import { cn } from "@/lib/utils"

/**
 * Compact bar-chart of recent rates indicating direction. Server-renderable
 * (no client hooks); bars are colored green when up, red when down.
 */
export function CurrencySparkline({
  data,
  up,
}: {
  data: number[]
  up: boolean
}) {
  if (data.length < 2) {
    return <div className="h-8 w-24 rounded bg-muted/40" aria-hidden />
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  return (
    <div className="flex h-8 w-24 items-end gap-px" aria-hidden>
      {data.map((value, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-sm",
            up ? "bg-emerald-500/70" : "bg-destructive/70"
          )}
          style={{ height: `${Math.max(10, ((value - min) / range) * 100)}%` }}
        />
      ))}
    </div>
  )
}
