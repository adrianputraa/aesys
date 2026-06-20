import "server-only"

import { asc, eq, inArray } from "drizzle-orm"

import { currency } from "@/features/admin/schema"
import {
  listCurrencyOptions,
  type CurrencyOption,
} from "@/features/admin/server/currency"
import { item } from "@/features/inventory/schema"
import {
  shippingCompany,
  shippingPlan,
  shippingRate,
} from "@/features/shipping/schema"
import { db } from "@/lib/db/app"

export type OrderableItem = {
  publicId: string
  name: string
  unit: string
  basePrice: number
  currencyCode: string
  currencyRate: number
  weightKg: number
  volumeM3: number
  stock: number
  minimumOrder: number
  maximumOrder: number | null
}

export type OrderPlan = {
  publicId: string
  name: string
  destination: string
  rateMetric: "weight" | "volume"
  pricingMode: "flat" | "per_unit"
  estimatedDaysMin: number | null
  estimatedDaysMax: number | null
  includeImportTax: boolean
  includeExportTax: boolean
  includeHandlingFee: boolean
  includeInsurance: boolean
  tiers: { fromQty: number; toQty: number | null; price: number }[]
}

export type OrderCompany = {
  publicId: string
  name: string
  baseCurrencyCode: string
  baseCurrencySymbol: string
  baseCurrencyRate: number
  minWeightKg: number | null
  minVolumeM3: number | null
  plans: OrderPlan[]
}

export type OrderFormData = {
  currencies: CurrencyOption[]
  items: OrderableItem[]
  companies: OrderCompany[]
}

export async function getOrderFormData(): Promise<OrderFormData> {
  const currencies = await listCurrencyOptions()

  const itemRows = await db
    .select({
      publicId: item.publicId,
      name: item.name,
      unit: item.unit,
      basePrice: item.basePrice,
      stock: item.stock,
      minimumOrder: item.minimumOrder,
      maximumOrder: item.maximumOrder,
      weightGrams: item.weightGrams,
      lengthCm: item.lengthCm,
      widthCm: item.widthCm,
      heightCm: item.heightCm,
      code: currency.code,
      rate: currency.rate,
    })
    .from(item)
    .innerJoin(currency, eq(item.baseCurrencyId, currency.id))
    .orderBy(asc(item.name))

  const items: OrderableItem[] = itemRows.map((r) => ({
    publicId: r.publicId,
    name: r.name,
    unit: r.unit,
    basePrice: r.basePrice,
    currencyCode: r.code,
    currencyRate: r.rate,
    weightKg: r.weightGrams != null ? r.weightGrams / 1000 : 0,
    volumeM3:
      r.lengthCm != null && r.widthCm != null && r.heightCm != null
        ? (r.lengthCm * r.widthCm * r.heightCm) / 1_000_000
        : 0,
    stock: r.stock,
    minimumOrder: r.minimumOrder,
    maximumOrder: r.maximumOrder,
  }))

  const companyRows = await db
    .select({
      id: shippingCompany.id,
      publicId: shippingCompany.publicId,
      name: shippingCompany.name,
      minWeightKg: shippingCompany.minWeightKg,
      minVolumeM3: shippingCompany.minVolumeM3,
      code: currency.code,
      symbol: currency.symbol,
      rate: currency.rate,
    })
    .from(shippingCompany)
    .innerJoin(currency, eq(shippingCompany.baseCurrencyId, currency.id))
    .orderBy(asc(shippingCompany.name))

  const companyIds = companyRows.map((c) => c.id)
  const planRows = companyIds.length
    ? await db
        .select()
        .from(shippingPlan)
        .where(inArray(shippingPlan.shippingCompanyId, companyIds))
        .orderBy(asc(shippingPlan.name))
    : []

  const planIds = planRows.map((p) => p.id)
  const tierRows = planIds.length
    ? await db
        .select()
        .from(shippingRate)
        .where(inArray(shippingRate.planId, planIds))
        .orderBy(asc(shippingRate.sortOrder), asc(shippingRate.fromQty))
    : []

  const tiersByPlan = new Map<
    number,
    { fromQty: number; toQty: number | null; price: number }[]
  >()
  for (const t of tierRows) {
    const list = tiersByPlan.get(t.planId) ?? []
    list.push({ fromQty: t.fromQty, toQty: t.toQty, price: t.price })
    tiersByPlan.set(t.planId, list)
  }

  const plansByCompany = new Map<number, OrderPlan[]>()
  for (const p of planRows) {
    const list = plansByCompany.get(p.shippingCompanyId) ?? []
    list.push({
      publicId: p.publicId,
      name: p.name,
      destination: p.destination,
      rateMetric: p.rateMetric === "volume" ? "volume" : "weight",
      pricingMode: p.pricingMode === "per_unit" ? "per_unit" : "flat",
      estimatedDaysMin: p.estimatedDaysMin,
      estimatedDaysMax: p.estimatedDaysMax,
      includeImportTax: p.includeImportTax,
      includeExportTax: p.includeExportTax,
      includeHandlingFee: p.includeHandlingFee,
      includeInsurance: p.includeInsurance,
      tiers: tiersByPlan.get(p.id) ?? [],
    })
    plansByCompany.set(p.shippingCompanyId, list)
  }

  const companies: OrderCompany[] = companyRows.map((c) => ({
    publicId: c.publicId,
    name: c.name,
    baseCurrencyCode: c.code,
    baseCurrencySymbol: c.symbol,
    baseCurrencyRate: c.rate,
    minWeightKg: c.minWeightKg,
    minVolumeM3: c.minVolumeM3,
    plans: plansByCompany.get(c.id) ?? [],
  }))

  return { currencies, items, companies }
}
