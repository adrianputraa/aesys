"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

type Series = {
  code: string
  symbol: string
  isItemBase: boolean
  points: number[]
}

/**
 * Item price over time expressed in each currency (derived from FX rate
 * history). The item's own base-currency line is drawn solid; the others
 * (which move only as exchange rates move) are dashed.
 */
export function ItemPriceChart({
  series,
  timestamps,
}: {
  series: Series[]
  timestamps: string[]
}) {
  if (timestamps.length < 2 || series.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Not enough exchange-rate history yet to chart cross-currency pricing.
      </p>
    )
  }

  const shown = series.slice(0, COLORS.length)
  const config: ChartConfig = {}
  shown.forEach((s, i) => {
    config[s.code] = { label: s.code, color: COLORS[i % COLORS.length] }
  })

  const data: Record<string, string | number>[] = timestamps.map((t, idx) => {
    const row: Record<string, string | number> = {
      label: new Date(t).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }
    for (const s of shown) row[s.code] = s.points[idx]
    return row
  })

  return (
    <ChartContainer config={config} className="h-[280px] w-full">
      <LineChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          domain={["auto", "auto"]}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        {shown.map((s) => (
          <Line
            key={s.code}
            dataKey={s.code}
            type="monotone"
            stroke={`var(--color-${s.code})`}
            strokeWidth={s.isItemBase ? 2.5 : 1.5}
            strokeDasharray={s.isItemBase ? undefined : "4 3"}
            dot={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
