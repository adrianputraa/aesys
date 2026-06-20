/**
 * Deterministic, template-based item description generator — NO AI. Builds a
 * short, human-readable blurb from the item's own fields. The same inputs always
 * produce the same text (a hash of the name seeds the template choice), so it's
 * predictable and reproducible.
 */

export type DescribeInput = {
  name: string
  unit?: string
  categories?: string[]
  price?: number
  currencyCode?: string
  currencySymbol?: string
}

const OPENERS = [
  "{name} is a dependable {cat}choice",
  "{name} is a popular {cat}pick for everyday needs",
  "Meet {name}, a versatile {cat}option",
  "{name} brings reliable quality to your {cat}lineup",
]

const CLOSERS = [
  "Ideal for everyday use and bulk orders alike.",
  "A solid addition to any order.",
  "Stocked and ready to ship.",
  "Great value for regular buyers.",
]

/** Small stable string hash (FNV-ish) for deterministic template selection. */
function seedFrom(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function formatPrice(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

export function generateDescription(input: DescribeInput): string {
  const name = input.name.trim() || "This item"
  const seed = seedFrom(name.toLowerCase())

  const category = (input.categories ?? [])
    .map((c) => c.trim())
    .filter(Boolean)[0]
  const catText = category ? `${category.toLowerCase()} ` : ""

  let opener = OPENERS[seed % OPENERS.length].replace("{name}", name)
  opener = opener.replace("{cat}", catText)

  const clauses: string[] = []
  const unit = input.unit?.trim()
  if (unit) clauses.push(`sold per ${unit}`)
  if (
    typeof input.price === "number" &&
    Number.isFinite(input.price) &&
    input.price > 0 &&
    input.currencyCode
  ) {
    const sym = input.currencySymbol ?? ""
    clauses.push(
      `priced at ${sym}${formatPrice(input.price)} ${input.currencyCode}` +
        (unit ? ` per ${unit}` : "")
    )
  }

  const closer = CLOSERS[(seed >> 3) % CLOSERS.length]

  const body = clauses.length
    ? `${opener}, ${clauses.join(", ")}.`
    : `${opener}.`
  return `${body} ${closer}`
}
