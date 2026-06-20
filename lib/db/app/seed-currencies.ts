import "server-only"

import { CURRENCY_CATALOG } from "@/features/admin/lib/currency-catalog"
import { currency, currencyRateHistory } from "@/features/admin/schema"
import { db } from "@/lib/db/app"

/**
 * Seeds the base currencies on startup (idempotently, keyed by `code`). For each
 * newly inserted currency it also writes an initial rate-history row so the
 * 24-hour comparison and chart have a baseline.
 */
export async function seedCurrencies(): Promise<void> {
  try {
    let added = 0
    for (const def of CURRENCY_CATALOG) {
      const [inserted] = await db
        .insert(currency)
        .values({
          code: def.code,
          name: def.name,
          symbol: def.symbol,
          rate: def.rate,
          isBase: def.isBase,
          type: def.type,
        })
        .onConflictDoNothing({ target: currency.code })
        .returning({ id: currency.id, rate: currency.rate })

      if (inserted) {
        added++
        await db.insert(currencyRateHistory).values({
          currencyId: inserted.id,
          rate: inserted.rate,
          source: "seed",
        })
      }
    }
    if (added > 0) {
      console.log(`[currencies] seeded ${added} new currency(ies)`)
    }
  } catch (error) {
    console.error(
      "[currencies] seeding skipped (is the database migrated?):",
      error instanceof Error ? error.message : error
    )
  }
}
