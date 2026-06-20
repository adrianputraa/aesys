import "server-only"

import { and, asc, desc, eq, lte } from "drizzle-orm"

import { FX_API_BASE, percentChange } from "@/features/admin/lib/fx"
import { currency, currencyRateHistory } from "@/features/admin/schema"
import { isUuid } from "@/features/auth/lib/validation"
import { db } from "@/lib/db/app"
import { user as userTable } from "@/lib/db/app/auth-schema"

const DAY_MS = 24 * 60 * 60 * 1000

export type CurrencyType = "standard" | "custom"

export type CurrencyListItem = {
  publicId: string
  code: string
  name: string
  symbol: string
  isBase: boolean
  type: CurrencyType
  rate: number
  rate24hAgo: number
  changePercent: number
  updatedAt: string
  lastUpdatedBy: string | null
  sparkline: number[]
}

export type RatePoint = {
  rate: number
  recordedAt: string
  source: string
}

export type CurrencyDetail = {
  publicId: string
  code: string
  name: string
  symbol: string
  isBase: boolean
  type: CurrencyType
  rate: number
  rate24hAgo: number
  changePercent: number
  createdAt: string
  updatedAt: string
  lastUpdatedBy: string | null
  history: RatePoint[]
}

/** Rate this currency had ~24h ago (or its earliest recorded rate). */
async function rate24hAgo(
  currencyId: number,
  currentRate: number
): Promise<number> {
  const cutoff = new Date(Date.now() - DAY_MS)
  const [atCutoff] = await db
    .select({ rate: currencyRateHistory.rate })
    .from(currencyRateHistory)
    .where(
      and(
        eq(currencyRateHistory.currencyId, currencyId),
        lte(currencyRateHistory.recordedAt, cutoff)
      )
    )
    .orderBy(desc(currencyRateHistory.recordedAt))
    .limit(1)
  if (atCutoff) return atCutoff.rate

  const [earliest] = await db
    .select({ rate: currencyRateHistory.rate })
    .from(currencyRateHistory)
    .where(eq(currencyRateHistory.currencyId, currencyId))
    .orderBy(asc(currencyRateHistory.recordedAt))
    .limit(1)
  return earliest?.rate ?? currentRate
}

export async function listCurrencies(): Promise<CurrencyListItem[]> {
  const rows = await db
    .select({
      id: currency.id,
      publicId: currency.publicId,
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      isBase: currency.isBase,
      type: currency.type,
      rate: currency.rate,
      updatedAt: currency.updatedAt,
      updatedByName: userTable.name,
    })
    .from(currency)
    .leftJoin(userTable, eq(currency.lastUpdatedBy, userTable.id))
    .orderBy(desc(currency.isBase), currency.code)

  return Promise.all(
    rows.map(async (c) => {
      const prev = await rate24hAgo(c.id, c.rate)
      const points = await db
        .select({ rate: currencyRateHistory.rate })
        .from(currencyRateHistory)
        .where(eq(currencyRateHistory.currencyId, c.id))
        .orderBy(desc(currencyRateHistory.recordedAt))
        .limit(12)
      return {
        publicId: c.publicId,
        code: c.code,
        name: c.name,
        symbol: c.symbol,
        isBase: c.isBase,
        type: c.type as CurrencyType,
        rate: c.rate,
        rate24hAgo: prev,
        changePercent: percentChange(prev, c.rate),
        updatedAt: c.updatedAt.toISOString(),
        lastUpdatedBy: c.updatedByName ?? null,
        sparkline: points.map((p) => p.rate).reverse(),
      }
    })
  )
}

export async function getCurrencyByPublicId(
  publicId: string
): Promise<CurrencyDetail | null> {
  if (!isUuid(publicId)) return null

  const [c] = await db
    .select({
      id: currency.id,
      publicId: currency.publicId,
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      isBase: currency.isBase,
      type: currency.type,
      rate: currency.rate,
      createdAt: currency.createdAt,
      updatedAt: currency.updatedAt,
      updatedByName: userTable.name,
    })
    .from(currency)
    .leftJoin(userTable, eq(currency.lastUpdatedBy, userTable.id))
    .where(eq(currency.publicId, publicId))
    .limit(1)
  if (!c) return null

  const history = await db
    .select({
      rate: currencyRateHistory.rate,
      recordedAt: currencyRateHistory.recordedAt,
      source: currencyRateHistory.source,
    })
    .from(currencyRateHistory)
    .where(eq(currencyRateHistory.currencyId, c.id))
    .orderBy(asc(currencyRateHistory.recordedAt))
    .limit(100)

  const prev = await rate24hAgo(c.id, c.rate)

  return {
    publicId: c.publicId,
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    isBase: c.isBase,
    type: c.type as CurrencyType,
    rate: c.rate,
    rate24hAgo: prev,
    changePercent: percentChange(prev, c.rate),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    lastUpdatedBy: c.updatedByName ?? null,
    history: history.map((h) => ({
      rate: h.rate,
      recordedAt: h.recordedAt.toISOString(),
      source: h.source,
    })),
  }
}

export async function getBaseCurrency() {
  const [base] = await db
    .select()
    .from(currency)
    .where(eq(currency.isBase, true))
    .limit(1)
  return base ?? null
}

export type CurrencyOption = {
  publicId: string
  code: string
  symbol: string
  rate: number
  isBase: boolean
}

/** Lightweight currency list for pickers (no history/sparkline work). */
export async function listCurrencyOptions(): Promise<CurrencyOption[]> {
  return db
    .select({
      publicId: currency.publicId,
      code: currency.code,
      symbol: currency.symbol,
      rate: currency.rate,
      isBase: currency.isBase,
    })
    .from(currency)
    .orderBy(desc(currency.isBase), currency.code)
}

/** Fetches live rates relative to `baseCode` from the free open.er-api.com. */
export async function fetchRatesFromApi(
  baseCode: string
): Promise<{ rates: Record<string, number>; lastUpdate: string | null }> {
  const res = await fetch(`${FX_API_BASE}/${encodeURIComponent(baseCode)}`, {
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Exchange-rate API error (${res.status})`)
  const data = (await res.json()) as {
    result?: string
    rates?: Record<string, number>
    time_last_update_utc?: string
  }
  if (data.result !== "success" || !data.rates) {
    throw new Error("Exchange-rate API returned no rates")
  }
  return { rates: data.rates, lastUpdate: data.time_last_update_utc ?? null }
}
