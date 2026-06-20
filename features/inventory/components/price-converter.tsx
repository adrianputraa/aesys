"use client"

import { ArrowRightIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { convert, formatRate } from "@/features/admin/lib/fx"

export type ConverterCurrency = {
  publicId: string
  code: string
  symbol: string
  rate: number
}

/**
 * Helper: enter a price in any currency and convert it into the item's base
 * currency, then apply it to the base-price field. Conversion is instant
 * (client-side via the FX rates).
 */
export function PriceConverter({
  currencies,
  baseCurrencyPublicId,
  onApply,
}: {
  currencies: ConverterCurrency[]
  baseCurrencyPublicId: string
  onApply: (value: number) => void
}) {
  const base = currencies.find((c) => c.publicId === baseCurrencyPublicId)
  const others = currencies.filter((c) => c.publicId !== baseCurrencyPublicId)
  const [fromId, setFromId] = React.useState(others[0]?.publicId ?? "")
  const [amount, setAmount] = React.useState("")

  // Derive a valid "from" currency in render (it may equal the new base after a
  // base change) — no effect needed.
  const effectiveFromId = others.some((c) => c.publicId === fromId)
    ? fromId
    : (others[0]?.publicId ?? "")

  const from = currencies.find((c) => c.publicId === effectiveFromId)
  const amountNum = Number(amount)
  const valid =
    Boolean(base && from) && Number.isFinite(amountNum) && amountNum > 0
  const converted =
    valid && base && from ? convert(amountNum, from.rate, base.rate) : 0

  if (!base || others.length === 0) return null

  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <p className="mb-2 text-xs text-muted-foreground">
        Or enter the price in another currency and convert it to {base.code}.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          value={amount}
          placeholder="Amount"
          onChange={(e) => setAmount(e.target.value)}
          className="w-28"
        />
        <Select value={effectiveFromId} onValueChange={setFromId}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {others.map((c) => (
              <SelectItem key={c.publicId} value={c.publicId}>
                {c.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ArrowRightIcon className="size-4 text-muted-foreground" />

        <span className="text-sm tabular-nums">
          {valid ? (
            <>
              {base.symbol}
              {formatRate(converted)} {base.code}
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!valid}
          onClick={() => onApply(Number(converted.toFixed(6)))}
          className="ml-auto"
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
