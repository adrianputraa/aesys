/**
 * Foreign-exchange helpers. `rate` is "units of the currency per 1 unit of the
 * base currency" (base currency rate = 1).
 */

/** Convert an amount between currencies given their base-relative rates. */
export function convert(
  amount: number,
  fromRate: number,
  toRate: number
): number {
  if (!Number.isFinite(fromRate) || fromRate <= 0) return 0
  return (amount * toRate) / fromRate
}

/** Percentage change from `previous` to `current` (0 when previous is 0). */
export function percentChange(previous: number, current: number): number {
  if (!previous) return 0
  return ((current - previous) / previous) * 100
}

/**
 * Full-precision rate for display (fixed locale so server/client output
 * matches). Sub-1 rates (common when a strong currency is priced against a
 * weaker base, e.g. USD per 1 IDR) use significant digits so they stay precise
 * and readable instead of rounding to "0.000061". Used on hover / when "More
 * decimals" is on.
 */
export function formatRate(rate: number): string {
  if (!Number.isFinite(rate)) return "—"
  if (rate !== 0 && Math.abs(rate) < 1) {
    return rate.toLocaleString("en-US", { maximumSignificantDigits: 6 })
  }
  return rate.toLocaleString("en-US", { maximumFractionDigits: 6 })
}

/**
 * Compact rate for at-a-glance lists: **0 decimals for whole numbers, exactly 3
 * otherwise** (a non-zero value that rounds to 0 at 3 places still shows
 * "0.000" so it doesn't read as exactly zero). Full precision is available on
 * hover or via the "More decimals" toggle (see `formatRate`).
 */
export function formatRateCompact(rate: number): string {
  if (!Number.isFinite(rate)) return "—"
  if (rate === 0) return "0"
  const rounded = Math.round(rate * 1000) / 1000
  if (rounded !== 0 && Number.isInteger(rounded)) {
    return rounded.toLocaleString("en-US", { maximumFractionDigits: 0 })
  }
  return rate.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })
}

/** Free, no-key FX API (open.er-api.com) — rates are relative to `baseCode`. */
export const FX_API_BASE = "https://open.er-api.com/v6/latest"
