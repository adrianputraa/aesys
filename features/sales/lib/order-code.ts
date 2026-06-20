import { randomBytes } from "node:crypto"

/**
 * Algorithmic, human-facing order identifier shown on invoices — e.g.
 * `ORD-20260620-7KQ2`. Distinct from the integer `id` and the UUID `public_id`.
 * The 4-char suffix is cryptographically random (avoids the look-alike chars
 * I/O/0/1); callers retry on the rare unique-constraint clash.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // 32 chars, no I/O/0/1

export function generateOrderCode(date: Date = new Date()): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, "0")
  const d = String(date.getUTCDate()).padStart(2, "0")
  const bytes = randomBytes(4)
  let suffix = ""
  for (let i = 0; i < 4; i++) suffix += ALPHABET[bytes[i] % ALPHABET.length]
  return `ORD-${y}${m}${d}-${suffix}`
}
