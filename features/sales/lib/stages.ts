/**
 * Templated order timeline stages. Admins advance an order to the next stage
 * (one click) or set any stage manually. `internationalOnly` stages only apply
 * to international orders.
 */
export type OrderStageDef = {
  key: string
  label: string
  description: string
  internationalOnly?: boolean
}

export const ORDER_STAGES: OrderStageDef[] = [
  {
    key: "received",
    label: "Order received",
    description: "The order was placed and recorded.",
  },
  {
    key: "processed",
    label: "Order processed",
    description: "Items picked and packed.",
  },
  {
    key: "sent_to_shipping",
    label: "Sent to shipping",
    description: "Handed over to the forwarder.",
  },
  {
    key: "on_the_way",
    label: "On the way",
    description: "In transit to the destination.",
  },
  {
    key: "at_storage",
    label: "Reached storage",
    description: "Arrived at an intermediate storage/customs facility.",
    internationalOnly: true,
  },
  {
    key: "out_for_delivery",
    label: "Going to buyer address",
    description: "Out for final delivery to the buyer.",
  },
  {
    key: "completed",
    label: "Order completed",
    description: "Delivered and completed.",
  },
]

export const ORDER_STAGE_KEYS = ORDER_STAGES.map((s) => s.key)

/** Stages applicable to an order (drops international-only stages if domestic). */
export function stagesFor(isInternational: boolean): OrderStageDef[] {
  return ORDER_STAGES.filter((s) => isInternational || !s.internationalOnly)
}

export function stageLabel(key: string): string {
  return ORDER_STAGES.find((s) => s.key === key)?.label ?? key
}

/** The next stage after `current` for this order, or null if already at the end. */
export function nextStage(
  current: string,
  isInternational: boolean
): string | null {
  const stages = stagesFor(isInternational)
  const i = stages.findIndex((s) => s.key === current)
  if (i === -1) return stages[0]?.key ?? null
  return i < stages.length - 1 ? stages[i + 1].key : null
}

export function isValidStage(key: string): boolean {
  return ORDER_STAGE_KEYS.includes(key)
}
