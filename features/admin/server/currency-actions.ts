"use server"

import { eq, sql } from "drizzle-orm"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { authorize } from "@/features/admin/server/permissions"
import {
  fetchRatesFromApi,
  getBaseCurrency,
} from "@/features/admin/server/currency"
import { currency, currencyRateHistory } from "@/features/admin/schema"
import { isUuid } from "@/features/auth/lib/validation"
import type { ActionState, FieldErrors } from "@/features/auth/types"
import { db } from "@/lib/db/app"

const FORBIDDEN: ActionState = {
  status: "error",
  message: "You don't have permission to do that.",
}

const RATE_EPSILON = 1e-9

export type CurrencyType = "standard" | "custom"

export type CurrencyInput = {
  code?: string
  name?: string
  symbol?: string
  rate?: number | string
  type?: CurrencyType
}

function validate(
  input: CurrencyInput,
  opts: { withCode: boolean }
): {
  values: {
    code: string
    name: string
    symbol: string
    rate: number
    type: CurrencyType
  }
  fieldErrors: FieldErrors
  ok: boolean
} {
  const code = String(input.code ?? "")
    .trim()
    .toUpperCase()
  const name = String(input.name ?? "").trim()
  const symbol = String(input.symbol ?? "").trim()
  const rate = Number(input.rate)
  const type: CurrencyType = input.type === "custom" ? "custom" : "standard"

  const fieldErrors: FieldErrors = {}
  if (opts.withCode) {
    if (type === "custom") {
      // Custom ("OTHER") currencies allow a freer, admin-defined code.
      if (!/^[A-Z0-9]{2,10}$/.test(code)) {
        fieldErrors.code = "Use 2–10 letters or digits."
      }
    } else if (!/^[A-Z]{3}$/.test(code)) {
      fieldErrors.code = "Select a currency or choose “Other”."
    }
  }
  if (!name || name.length > 64) fieldErrors.name = "Enter a name (≤ 64 chars)."
  if (!symbol || symbol.length > 8) {
    fieldErrors.symbol = "Enter a symbol (≤ 8 chars)."
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    fieldErrors.rate = "Rate must be greater than 0."
  }
  return {
    values: { code, name, symbol, rate, type },
    fieldErrors,
    ok: Object.keys(fieldErrors).length === 0,
  }
}

// ---------------------------------------------------------------------------
// Add a currency
// ---------------------------------------------------------------------------

export async function addCurrencyAction(
  input: CurrencyInput
): Promise<ActionState> {
  const session = await authorize(PERMISSIONS.MANAGE_CURRENCY)
  if (!session) return FORBIDDEN

  const { values, fieldErrors, ok } = validate(input, { withCode: true })
  if (!ok) {
    return { status: "error", message: "Check the fields below.", fieldErrors }
  }

  const [existing] = await db
    .select({ id: currency.id })
    .from(currency)
    .where(eq(currency.code, values.code))
    .limit(1)
  if (existing) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: { code: "That currency already exists." },
    }
  }

  const actorId = Number(session.user.id)
  const [created] = await db
    .insert(currency)
    .values({
      code: values.code,
      name: values.name,
      symbol: values.symbol,
      rate: values.rate,
      isBase: false,
      type: values.type,
      lastUpdatedBy: actorId,
    })
    .returning({ id: currency.id, rate: currency.rate })
  await db.insert(currencyRateHistory).values({
    currencyId: created.id,
    rate: created.rate,
    source: "manual",
    changedBy: actorId,
  })

  revalidatePath("/admin/currency")
  return { status: "success", message: `${values.code} added.` }
}

// ---------------------------------------------------------------------------
// Edit a currency (name, symbol, and its rate — the "manual set")
// ---------------------------------------------------------------------------

export async function updateCurrencyAction(
  publicId: string,
  input: CurrencyInput
): Promise<ActionState> {
  const session = await authorize(PERMISSIONS.MANAGE_CURRENCY)
  if (!session) return FORBIDDEN
  if (!isUuid(publicId))
    return { status: "error", message: "Invalid currency." }

  const { values, fieldErrors, ok } = validate(input, { withCode: false })
  if (!ok) {
    return { status: "error", message: "Check the fields below.", fieldErrors }
  }

  const [c] = await db
    .select({ id: currency.id, isBase: currency.isBase, rate: currency.rate })
    .from(currency)
    .where(eq(currency.publicId, publicId))
    .limit(1)
  if (!c) return { status: "error", message: "Currency not found." }

  // The base currency's rate is always 1.
  const newRate = c.isBase ? 1 : values.rate
  const rateChanged = Math.abs(newRate - c.rate) > RATE_EPSILON
  const actorId = Number(session.user.id)

  await db
    .update(currency)
    .set({
      name: values.name,
      symbol: values.symbol,
      rate: newRate,
      lastUpdatedBy: actorId,
      updatedAt: new Date(),
    })
    .where(eq(currency.id, c.id))

  if (rateChanged) {
    await db.insert(currencyRateHistory).values({
      currencyId: c.id,
      rate: newRate,
      source: "manual",
      changedBy: actorId,
    })
  }

  revalidatePath("/admin/currency")
  revalidatePath(`/admin/currency/${publicId}`)
  return { status: "success", message: "Currency updated." }
}

// ---------------------------------------------------------------------------
// Remove a currency (not the base)
// ---------------------------------------------------------------------------

export async function removeCurrencyAction(
  publicId: string
): Promise<ActionState> {
  const session = await authorize(PERMISSIONS.MANAGE_CURRENCY)
  if (!session) return FORBIDDEN
  if (!isUuid(publicId))
    return { status: "error", message: "Invalid currency." }

  const [c] = await db
    .select({ id: currency.id, isBase: currency.isBase })
    .from(currency)
    .where(eq(currency.publicId, publicId))
    .limit(1)
  if (!c) return { status: "error", message: "Currency not found." }
  if (c.isBase) {
    return { status: "error", message: "You can't remove the base currency." }
  }

  await db.delete(currency).where(eq(currency.id, c.id))
  revalidatePath("/admin/currency")
  redirect("/admin/currency")
}

// ---------------------------------------------------------------------------
// Single-click refresh from the live exchange-rate API
// ---------------------------------------------------------------------------

export async function refreshRatesAction(): Promise<ActionState> {
  const session = await authorize(PERMISSIONS.MANAGE_CURRENCY)
  if (!session) return FORBIDDEN

  const base = await getBaseCurrency()
  if (!base) {
    return { status: "error", message: "No base currency is configured." }
  }
  if (base.type === "custom") {
    return {
      status: "error",
      message:
        "Automatic updates are unavailable while the base currency is custom. Set a standard ISO currency as the base, or update rates manually.",
    }
  }

  let result: { rates: Record<string, number> }
  try {
    result = await fetchRatesFromApi(base.code)
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Couldn't reach the exchange-rate API.",
    }
  }

  const all = await db
    .select({
      id: currency.id,
      code: currency.code,
      rate: currency.rate,
      isBase: currency.isBase,
      type: currency.type,
    })
    .from(currency)
  const actorId = Number(session.user.id)
  let updated = 0
  let skippedCustom = 0

  for (const c of all) {
    if (c.isBase) continue
    // Custom ("OTHER") currencies are never auto-updated — manual rates only.
    if (c.type === "custom") {
      skippedCustom++
      continue
    }
    const next = result.rates[c.code]
    if (typeof next !== "number" || !Number.isFinite(next) || next <= 0)
      continue
    if (Math.abs(next - c.rate) < RATE_EPSILON) continue

    await db
      .update(currency)
      .set({ rate: next, lastUpdatedBy: actorId, updatedAt: new Date() })
      .where(eq(currency.id, c.id))
    await db.insert(currencyRateHistory).values({
      currencyId: c.id,
      rate: next,
      source: "api",
      changedBy: actorId,
    })
    updated++
  }

  revalidatePath("/admin/currency")
  const customNote =
    skippedCustom > 0
      ? ` (${skippedCustom} custom currency${skippedCustom === 1 ? "" : "ies"} skipped)`
      : ""
  return {
    status: "success",
    message:
      (updated > 0
        ? `Updated ${updated} currency rate${updated === 1 ? "" : "s"} from live data.`
        : "Rates are already up to date.") + customNote,
  }
}

// ---------------------------------------------------------------------------
// Change the base currency (rebases every rate)
// ---------------------------------------------------------------------------

/**
 * Makes the currency identified by `publicId` the new base. Every currency's
 * rate is divided by the new base's current rate so all rates stay consistent
 * (the new base becomes exactly 1). The **entire rate history is rescaled by the
 * same factor** too, so charts/sparklines stay on a single scale instead of
 * showing a cliff at the switch (dividing the whole series by a constant
 * preserves each currency's trend and percentage changes). Each currency also
 * gets a "rebase" history entry. Runs in a transaction so the base flag, rates,
 * and history never diverge.
 *
 * NOTE: this only rebases FX rates. Recalculating downstream item prices,
 * shipping, and taxes is deferred — see BACKLOG.md.
 */
export async function setBaseCurrencyAction(
  publicId: string
): Promise<ActionState> {
  const session = await authorize(PERMISSIONS.MANAGE_CURRENCY)
  if (!session) return FORBIDDEN
  if (!isUuid(publicId))
    return { status: "error", message: "Invalid currency." }

  const [target] = await db
    .select({
      id: currency.id,
      code: currency.code,
      rate: currency.rate,
      isBase: currency.isBase,
    })
    .from(currency)
    .where(eq(currency.publicId, publicId))
    .limit(1)
  if (!target) return { status: "error", message: "Currency not found." }
  if (target.isBase) {
    return { status: "success", message: `${target.code} is already the base.` }
  }
  if (!Number.isFinite(target.rate) || target.rate <= 0) {
    return {
      status: "error",
      message: "The selected currency has an invalid rate.",
    }
  }

  const actorId = Number(session.user.id)
  const divisor = target.rate

  const all = await db
    .select({ id: currency.id, rate: currency.rate, isBase: currency.isBase })
    .from(currency)

  await db.transaction(async (tx) => {
    const now = new Date()

    // Re-express the whole existing history in the new base (one scale factor
    // for every row) so each currency's chart keeps its shape and the latest
    // historical point lines up with the new current rate — no cliff.
    await tx
      .update(currencyRateHistory)
      .set({ rate: sql`${currencyRateHistory.rate} / ${divisor}` })

    for (const c of all) {
      const isNewBase = c.id === target.id
      const newRate = isNewBase ? 1 : c.rate / divisor
      const rateChanged = Math.abs(newRate - c.rate) > RATE_EPSILON

      await tx
        .update(currency)
        .set({
          rate: newRate,
          isBase: isNewBase,
          lastUpdatedBy: actorId,
          updatedAt: now,
        })
        .where(eq(currency.id, c.id))

      if (rateChanged) {
        await tx.insert(currencyRateHistory).values({
          currencyId: c.id,
          rate: newRate,
          source: "rebase",
          changedBy: actorId,
        })
      }
    }
  })

  revalidatePath("/admin/currency")
  revalidatePath(`/admin/currency/${publicId}`)
  return {
    status: "success",
    message: `${target.code} is now the base currency. All rates were recalculated.`,
  }
}
