import "server-only"

import { and, asc, count, desc, eq, inArray } from "drizzle-orm"

import { currency, currencyRateHistory } from "@/features/admin/schema"
import { convert } from "@/features/admin/lib/fx"
import { isUuid } from "@/features/auth/lib/validation"
import {
  category,
  item,
  itemCategory,
  itemMedia,
} from "@/features/inventory/schema"
import { db } from "@/lib/db/app"
import { user as userTable } from "@/lib/db/app/auth-schema"

const LOW_STOCK_THRESHOLD = 5

export type ItemMediaInfo = {
  publicId: string
  type: "image" | "video"
  url: string
  mimeType: string
}

export type ItemListRow = {
  publicId: string
  name: string
  unit: string
  basePrice: number
  baseCurrencyCode: string
  baseCurrencySymbol: string
  stock: number
  minimumOrder: number
  maximumOrder: number | null
  categories: string[]
  thumbnailUrl: string | null
  valueInBase: number // stock * unit price, in the system base currency
  createdAt: string
  createdByName: string | null
}

export type ItemDetail = {
  publicId: string
  name: string
  description: string
  unit: string
  basePrice: number
  baseCurrency: { code: string; symbol: string; publicId: string }
  minimumOrder: number
  maximumOrder: number | null
  stock: number
  categories: { publicId: string; name: string }[]
  media: ItemMediaInfo[]
  weightGrams: number | null
  lengthCm: number | null
  widthCm: number | null
  heightCm: number | null
  hsCode: string | null
  countryOfOrigin: string | null
  fragile: boolean
  hazardous: boolean
  createdAt: string
  updatedAt: string
  createdByName: string | null
  lastUpdatedByName: string | null
}

type CurrencyRow = {
  id: number
  code: string
  symbol: string
  rate: number
  isBase: boolean
}

async function allCurrencies(): Promise<CurrencyRow[]> {
  return db
    .select({
      id: currency.id,
      code: currency.code,
      symbol: currency.symbol,
      rate: currency.rate,
      isBase: currency.isBase,
    })
    .from(currency)
    .orderBy(desc(currency.isBase), currency.code)
}

/** Categories for a set of item ids, grouped by item id. */
async function categoriesByItem(
  itemIds: number[]
): Promise<Map<number, { publicId: string; name: string }[]>> {
  const map = new Map<number, { publicId: string; name: string }[]>()
  if (itemIds.length === 0) return map
  const rows = await db
    .select({
      itemId: itemCategory.itemId,
      publicId: category.publicId,
      name: category.name,
    })
    .from(itemCategory)
    .innerJoin(category, eq(itemCategory.categoryId, category.id))
    .where(inArray(itemCategory.itemId, itemIds))
    .orderBy(category.name)
  for (const r of rows) {
    const list = map.get(r.itemId) ?? []
    list.push({ publicId: r.publicId, name: r.name })
    map.set(r.itemId, list)
  }
  return map
}

/** First image url per item (the list thumbnail). */
async function thumbnailsByItem(
  itemIds: number[]
): Promise<Map<number, string>> {
  const map = new Map<number, string>()
  if (itemIds.length === 0) return map
  const rows = await db
    .select({
      itemId: itemMedia.itemId,
      url: itemMedia.url,
    })
    .from(itemMedia)
    .where(and(eq(itemMedia.type, "image"), inArray(itemMedia.itemId, itemIds)))
    .orderBy(itemMedia.itemId, itemMedia.sortOrder, itemMedia.id)
  for (const r of rows) {
    if (!map.has(r.itemId)) map.set(r.itemId, r.url)
  }
  return map
}

export async function listItems(limit = 200): Promise<ItemListRow[]> {
  const currencies = await allCurrencies()
  const byId = new Map(currencies.map((c) => [c.id, c]))
  const systemBase = currencies.find((c) => c.isBase)

  const rows = await db
    .select({
      id: item.id,
      publicId: item.publicId,
      name: item.name,
      unit: item.unit,
      basePrice: item.basePrice,
      baseCurrencyId: item.baseCurrencyId,
      stock: item.stock,
      minimumOrder: item.minimumOrder,
      maximumOrder: item.maximumOrder,
      createdAt: item.createdAt,
      createdByName: userTable.name,
    })
    .from(item)
    .leftJoin(userTable, eq(item.createdBy, userTable.id))
    .orderBy(desc(item.createdAt))
    .limit(limit)

  const ids = rows.map((r) => r.id)
  const [cats, thumbs] = await Promise.all([
    categoriesByItem(ids),
    thumbnailsByItem(ids),
  ])

  return rows.map((r) => {
    const cur = byId.get(r.baseCurrencyId)
    const valueInBase =
      cur && systemBase
        ? convert(r.basePrice, cur.rate, systemBase.rate) * r.stock
        : 0
    return {
      publicId: r.publicId,
      name: r.name,
      unit: r.unit,
      basePrice: r.basePrice,
      baseCurrencyCode: cur?.code ?? "?",
      baseCurrencySymbol: cur?.symbol ?? "",
      stock: r.stock,
      minimumOrder: r.minimumOrder,
      maximumOrder: r.maximumOrder,
      categories: (cats.get(r.id) ?? []).map((c) => c.name),
      thumbnailUrl: thumbs.get(r.id) ?? null,
      valueInBase,
      createdAt: r.createdAt.toISOString(),
      createdByName: r.createdByName ?? null,
    }
  })
}

export async function getItemByPublicId(
  publicId: string
): Promise<ItemDetail | null> {
  if (!isUuid(publicId)) return null

  const [row] = await db
    .select({
      id: item.id,
      publicId: item.publicId,
      name: item.name,
      description: item.description,
      unit: item.unit,
      basePrice: item.basePrice,
      minimumOrder: item.minimumOrder,
      maximumOrder: item.maximumOrder,
      stock: item.stock,
      weightGrams: item.weightGrams,
      lengthCm: item.lengthCm,
      widthCm: item.widthCm,
      heightCm: item.heightCm,
      hsCode: item.hsCode,
      countryOfOrigin: item.countryOfOrigin,
      fragile: item.fragile,
      hazardous: item.hazardous,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      createdBy: item.createdBy,
      lastUpdatedBy: item.lastUpdatedBy,
      baseCode: currency.code,
      baseSymbol: currency.symbol,
      basePublicId: currency.publicId,
    })
    .from(item)
    .innerJoin(currency, eq(item.baseCurrencyId, currency.id))
    .where(eq(item.publicId, publicId))
    .limit(1)
  if (!row) return null

  const userIds = [row.createdBy, row.lastUpdatedBy].filter(
    (v): v is number => v != null
  )

  const [cats, media, names] = await Promise.all([
    db
      .select({ publicId: category.publicId, name: category.name })
      .from(itemCategory)
      .innerJoin(category, eq(itemCategory.categoryId, category.id))
      .where(eq(itemCategory.itemId, row.id))
      .orderBy(category.name),
    db
      .select({
        publicId: itemMedia.publicId,
        type: itemMedia.type,
        url: itemMedia.url,
        mimeType: itemMedia.mimeType,
      })
      .from(itemMedia)
      .where(eq(itemMedia.itemId, row.id))
      .orderBy(itemMedia.sortOrder, itemMedia.id),
    userIds.length
      ? db
          .select({ id: userTable.id, name: userTable.name })
          .from(userTable)
          .where(inArray(userTable.id, userIds))
      : Promise.resolve([] as { id: number; name: string }[]),
  ])

  const nameById = new Map(names.map((n) => [n.id, n.name]))

  return {
    publicId: row.publicId,
    name: row.name,
    description: row.description,
    unit: row.unit,
    basePrice: row.basePrice,
    baseCurrency: {
      code: row.baseCode,
      symbol: row.baseSymbol,
      publicId: row.basePublicId,
    },
    minimumOrder: row.minimumOrder,
    maximumOrder: row.maximumOrder,
    stock: row.stock,
    categories: cats,
    media: media.map((m) => ({
      publicId: m.publicId,
      type: m.type === "video" ? "video" : "image",
      url: m.url,
      mimeType: m.mimeType,
    })),
    weightGrams: row.weightGrams,
    lengthCm: row.lengthCm,
    widthCm: row.widthCm,
    heightCm: row.heightCm,
    hsCode: row.hsCode,
    countryOfOrigin: row.countryOfOrigin,
    fragile: row.fragile,
    hazardous: row.hazardous,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByName:
      row.createdBy != null ? (nameById.get(row.createdBy) ?? null) : null,
    lastUpdatedByName:
      row.lastUpdatedBy != null
        ? (nameById.get(row.lastUpdatedBy) ?? null)
        : null,
  }
}

// ---------------------------------------------------------------------------
// Historical / cross-currency pricing for the item detail
// ---------------------------------------------------------------------------

export type ItemCurrencyPrice = {
  code: string
  symbol: string
  isBase: boolean // the item's base currency
  value: number
}

export type ItemPriceSeries = {
  timestamps: string[]
  series: {
    code: string
    symbol: string
    isItemBase: boolean
    points: number[]
  }[]
}

/** The item's base price converted into every currency at current rates. */
export async function getItemCurrentPrices(
  basePrice: number,
  baseCurrencyCode: string
): Promise<ItemCurrencyPrice[]> {
  const currencies = await allCurrencies()
  const base = currencies.find((c) => c.code === baseCurrencyCode)
  if (!base) return []
  return currencies.map((c) => ({
    code: c.code,
    symbol: c.symbol,
    isBase: c.code === baseCurrencyCode,
    value: convert(basePrice, base.rate, c.rate),
  }))
}

/**
 * Historical price of the item expressed in each currency, derived from the
 * currencies' rate histories. At each point in time the item's (current) base
 * price is converted using the cross rate that held then:
 *   price_in_c(t) = basePrice * rate_c(t) / rate_itemBase(t)
 * Rates are forward-filled across the union of all recorded timestamps so every
 * series shares one timeline. The item's own base-currency line is flat at the
 * base price (a useful reference). Returns empty when there isn't enough data.
 */
export async function getItemPriceSeries(
  basePrice: number,
  baseCurrencyCode: string,
  maxCurrencies = 6
): Promise<ItemPriceSeries> {
  const currencies = (await allCurrencies()).slice(0, maxCurrencies)
  const base = currencies.find((c) => c.code === baseCurrencyCode)
  if (!base) return { timestamps: [], series: [] }

  const ids = [...new Set([...currencies.map((c) => c.id), base.id])]
  const history = await db
    .select({
      currencyId: currencyRateHistory.currencyId,
      rate: currencyRateHistory.rate,
      recordedAt: currencyRateHistory.recordedAt,
    })
    .from(currencyRateHistory)
    .where(inArray(currencyRateHistory.currencyId, ids))
    .orderBy(asc(currencyRateHistory.recordedAt))

  const points = new Map<number, { t: number; rate: number }[]>()
  for (const h of history) {
    const list = points.get(h.currencyId) ?? []
    list.push({ t: h.recordedAt.getTime(), rate: h.rate })
    points.set(h.currencyId, list)
  }

  const timeSet = new Set<number>()
  for (const list of points.values()) for (const p of list) timeSet.add(p.t)
  const timeline = [...timeSet].sort((a, b) => a - b)
  if (timeline.length < 2) return { timestamps: [], series: [] }

  // Forward-fill: a currency's rate at time t is its most recent point ≤ t
  // (or its earliest known rate for times before that).
  const rateAt = (currencyId: number, t: number): number | null => {
    const list = points.get(currencyId)
    if (!list || list.length === 0) return null
    let rate = list[0].rate
    for (const p of list) {
      if (p.t <= t) rate = p.rate
      else break
    }
    return rate
  }

  const series = currencies.map((c) => ({
    code: c.code,
    symbol: c.symbol,
    isItemBase: c.code === baseCurrencyCode,
    points: timeline.map((t) => {
      const baseRate = rateAt(base.id, t)
      const cRate = rateAt(c.id, t)
      if (baseRate == null || cRate == null || baseRate <= 0) return 0
      return convert(basePrice, baseRate, cRate)
    }),
  }))

  return { timestamps: timeline.map((t) => new Date(t).toISOString()), series }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export type InventoryDashboard = {
  baseCode: string
  baseSymbol: string
  totalItems: number
  totalStockUnits: number
  totalValueInBase: number
  outOfStock: number
  lowStock: number
  categoriesCount: number
  items: ItemListRow[]
}

export async function getInventoryDashboard(): Promise<InventoryDashboard> {
  const currencies = await allCurrencies()
  const systemBase = currencies.find((c) => c.isBase)
  const items = await listItems(1000)

  const totalStockUnits = items.reduce((s, i) => s + i.stock, 0)
  const totalValueInBase = items.reduce((s, i) => s + i.valueInBase, 0)
  const outOfStock = items.filter((i) => i.stock === 0).length
  const lowStock = items.filter(
    (i) => i.stock > 0 && i.stock <= LOW_STOCK_THRESHOLD
  ).length

  const [{ total: categoriesCount }] = await db
    .select({ total: count() })
    .from(category)

  return {
    baseCode: systemBase?.code ?? "",
    baseSymbol: systemBase?.symbol ?? "",
    totalItems: items.length,
    totalStockUnits,
    totalValueInBase,
    outOfStock,
    lowStock,
    categoriesCount: Number(categoriesCount),
    items: items.slice(0, 100),
  }
}
