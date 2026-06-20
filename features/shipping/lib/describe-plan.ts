/**
 * Deterministic, template-based shipping-plan description — NO AI. Builds a
 * short blurb from the plan's own fields; the same inputs always produce the
 * same text (a hash of the name seeds the wording).
 */

export type DescribePlanInput = {
  name: string
  companyName?: string
  destination?: string
  rateMetric?: "weight" | "volume"
  estimatedDaysMin?: number | null
  estimatedDaysMax?: number | null
  includeImportTax?: boolean
  includeExportTax?: boolean
  includeHandlingFee?: boolean
  includeInsurance?: boolean
}

const OPENERS = [
  "{name} ships to {dest}",
  "{name} covers {dest}",
  "{name} is a {dest} shipping option",
  "{name} handles deliveries to {dest}",
]

function seedFrom(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function joinList(parts: string[]): string {
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
}

export function generatePlanDescription(input: DescribePlanInput): string {
  const name = input.name.trim() || "This plan"
  const dest = (input.destination ?? "").trim() || "your destination"
  const seed = seedFrom(name.toLowerCase())

  let opener = OPENERS[seed % OPENERS.length]
    .replace("{name}", name)
    .replace("{dest}", dest)
  if (input.companyName) opener += ` via ${input.companyName}`

  const clauses: string[] = []
  const min = input.estimatedDaysMin
  const max = input.estimatedDaysMax
  if (min != null && max != null) {
    clauses.push(
      min === max
        ? `with an estimated ${min}-day transit`
        : `with an estimated ${min}–${max} day transit`
    )
  } else if (max != null) {
    clauses.push(`with delivery in up to ${max} days`)
  } else if (min != null) {
    clauses.push(`with delivery from ${min} days`)
  }

  if (input.rateMetric) {
    clauses.push(`priced by ${input.rateMetric}`)
  }

  const included: string[] = []
  if (input.includeImportTax) included.push("import tax")
  if (input.includeExportTax) included.push("export tax")
  if (input.includeHandlingFee) included.push("handling fees")
  if (input.includeInsurance) included.push("insurance")

  const body = clauses.length
    ? `${opener}, ${clauses.join(", ")}.`
    : `${opener}.`
  const tail = included.length
    ? ` The quoted price includes ${joinList(included)}.`
    : " Taxes and handling are billed separately."

  return `${body}${tail}`
}
