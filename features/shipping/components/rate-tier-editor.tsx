"use client"

import { PlusIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export type TierRow = { fromQty: string; toQty: string; price: string }

export function emptyTier(): TierRow {
  return { fromQty: "0", toQty: "", price: "" }
}

/**
 * Edits a plan's rate tiers: rows of [from, to) with a price. `to` empty means
 * open-ended (∞). Units come from the plan's metric (kg / m³); price is in the
 * forwarder's base currency, per the plan's pricing mode.
 */
export function RateTierEditor({
  tiers,
  onChange,
  unitLabel,
  currencySymbol,
  perUnit,
  invalid,
}: {
  tiers: TierRow[]
  onChange: (tiers: TierRow[]) => void
  unitLabel: string
  currencySymbol: string
  perUnit: boolean
  invalid?: boolean
}) {
  function update(i: number, patch: Partial<TierRow>) {
    onChange(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }
  function remove(i: number) {
    onChange(tiers.filter((_, idx) => idx !== i))
  }
  function add() {
    const last = tiers[tiers.length - 1]
    const nextFrom = last && last.toQty !== "" ? last.toQty : ""
    onChange([...tiers, { fromQty: nextFrom, toQty: "", price: "" }])
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 text-xs text-muted-foreground">
        <span>From ({unitLabel})</span>
        <span>To ({unitLabel})</span>
        <span>
          Price ({currencySymbol}
          {perUnit ? `/${unitLabel}` : ""})
        </span>
        <span className="w-7" />
      </div>

      {tiers.map((tier, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2"
        >
          <Input
            type="number"
            step="any"
            min="0"
            value={tier.fromQty}
            aria-label={`Tier ${i + 1} from`}
            aria-invalid={invalid}
            onChange={(e) => update(i, { fromQty: e.target.value })}
          />
          <Input
            type="number"
            step="any"
            min="0"
            value={tier.toQty}
            placeholder="∞"
            aria-label={`Tier ${i + 1} to`}
            onChange={(e) => update(i, { toQty: e.target.value })}
          />
          <Input
            type="number"
            step="any"
            min="0"
            value={tier.price}
            placeholder="0.00"
            aria-label={`Tier ${i + 1} price`}
            aria-invalid={invalid}
            onChange={(e) => update(i, { price: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => remove(i)}
            disabled={tiers.length === 1}
            aria-label={`Remove tier ${i + 1}`}
          >
            <XIcon />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="w-fit"
      >
        <PlusIcon />
        Add tier
      </Button>
    </div>
  )
}
