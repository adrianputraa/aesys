import { convert } from "@/features/admin/lib/fx"

/**
 * Shared order-pricing math — pure, usable on client and server so the live
 * quote in the create-order form matches what the server persists.
 *
 * All currency rates are "units per 1 system-base unit" (the FX convention).
 */

export type RateTier = { fromQty: number; toQty: number | null; price: number }

/** Convert an item's base price into the order currency. */
export function priceInOrderCurrency(
  basePrice: number,
  itemRate: number,
  orderRate: number
): number {
  return convert(basePrice, itemRate, orderRate)
}

/**
 * Shipping fee for `quantity` (kg or m³ per the plan's metric), in the
 * forwarder's currency. Picks the tier whose [from, to) bracket contains the
 * quantity (falls back to the last tier). `per_unit` multiplies by quantity;
 * `flat` is the bracket price.
 */
export function evaluateShippingFee(
  tiers: RateTier[],
  pricingMode: "flat" | "per_unit",
  quantity: number
): number {
  if (quantity <= 0 || tiers.length === 0) return 0
  const sorted = [...tiers].sort((a, b) => a.fromQty - b.fromQty)
  const tier =
    sorted.find(
      (t) => quantity >= t.fromQty && (t.toQty == null || quantity < t.toQty)
    ) ?? sorted[sorted.length - 1]
  return pricingMode === "per_unit" ? tier.price * quantity : tier.price
}

/** Clamp a billable quantity up to a forwarder minimum (if any). */
export function applyMinimum(quantity: number, min: number | null): number {
  return min != null && quantity < min ? min : quantity
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}
