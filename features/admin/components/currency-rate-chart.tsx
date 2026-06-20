"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const config = {
  rate: { label: "Rate", color: "var(--chart-1)" },
} satisfies ChartConfig

/** Area chart of a currency's rate history over time (recharts via shadcn). */
export function CurrencyRateChart({
  history,
}: {
  history: { rate: number; recordedAt: string }[]
}) {
  if (history.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Not enough history to chart yet — update the rate to start tracking.
      </p>
    )
  }

  const data = history.map((h) => ({
    rate: h.rate,
    label: new Date(h.recordedAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }))

  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <AreaChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
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
        <Area
          dataKey="rate"
          type="monotone"
          stroke="var(--color-rate)"
          fill="var(--color-rate)"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
