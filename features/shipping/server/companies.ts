import "server-only"

import { asc, desc, eq, inArray } from "drizzle-orm"

import { currency } from "@/features/admin/schema"
import { isUuid } from "@/features/auth/lib/validation"
import {
  type PlanChange,
  shippingCompany,
  shippingPlan,
  shippingPlanEvent,
  shippingRate,
} from "@/features/shipping/schema"
import { db } from "@/lib/db/app"
import { user as userTable } from "@/lib/db/app/auth-schema"

export type ShippingCompanyListItem = {
  publicId: string
  name: string
  description: string
  website: string | null
  baseCurrencyCode: string
  baseCurrencySymbol: string
  minWeightKg: number | null
  minVolumeM3: number | null
  planCount: number
  destinations: string[]
  createdByName: string | null
  createdAt: string
}

export type ShippingRateTier = {
  publicId: string
  fromQty: number
  toQty: number | null
  price: number
}

export type PlanEventInfo = {
  publicId: string
  changes: PlanChange[]
  reason: string | null
  actorName: string | null
  createdAt: string
}

export type ShippingPlanInfo = {
  publicId: string
  name: string
  description: string
  destination: string
  estimatedDaysMin: number | null
  estimatedDaysMax: number | null
  rateMetric: "weight" | "volume"
  pricingMode: "flat" | "per_unit"
  includeImportTax: boolean
  includeExportTax: boolean
  includeHandlingFee: boolean
  includeInsurance: boolean
  tiers: ShippingRateTier[]
  events: PlanEventInfo[]
}

export type ShippingCompanyDetail = {
  publicId: string
  name: string
  description: string
  website: string | null
  baseCurrency: { code: string; symbol: string; publicId: string }
  minWeightKg: number | null
  minVolumeM3: number | null
  plans: ShippingPlanInfo[]
  createdAt: string
  updatedAt: string
  createdByName: string | null
  lastUpdatedByName: string | null
}

export async function listShippingCompanies(): Promise<
  ShippingCompanyListItem[]
> {
  const rows = await db
    .select({
      id: shippingCompany.id,
      publicId: shippingCompany.publicId,
      name: shippingCompany.name,
      description: shippingCompany.description,
      website: shippingCompany.website,
      minWeightKg: shippingCompany.minWeightKg,
      minVolumeM3: shippingCompany.minVolumeM3,
      createdAt: shippingCompany.createdAt,
      code: currency.code,
      symbol: currency.symbol,
      createdByName: userTable.name,
    })
    .from(shippingCompany)
    .innerJoin(currency, eq(shippingCompany.baseCurrencyId, currency.id))
    .leftJoin(userTable, eq(shippingCompany.createdBy, userTable.id))
    .orderBy(desc(shippingCompany.createdAt))

  const ids = rows.map((r) => r.id)
  const plans = ids.length
    ? await db
        .select({
          companyId: shippingPlan.shippingCompanyId,
          destination: shippingPlan.destination,
        })
        .from(shippingPlan)
        .where(inArray(shippingPlan.shippingCompanyId, ids))
    : []

  const byCompany = new Map<number, { count: number; dests: Set<string> }>()
  for (const p of plans) {
    const entry = byCompany.get(p.companyId) ?? { count: 0, dests: new Set() }
    entry.count++
    entry.dests.add(p.destination)
    byCompany.set(p.companyId, entry)
  }

  return rows.map((r) => {
    const agg = byCompany.get(r.id)
    return {
      publicId: r.publicId,
      name: r.name,
      description: r.description,
      website: r.website,
      baseCurrencyCode: r.code,
      baseCurrencySymbol: r.symbol,
      minWeightKg: r.minWeightKg,
      minVolumeM3: r.minVolumeM3,
      planCount: agg?.count ?? 0,
      destinations: agg ? [...agg.dests].sort() : [],
      createdByName: r.createdByName ?? null,
      createdAt: r.createdAt.toISOString(),
    }
  })
}

export async function getShippingCompanyByPublicId(
  publicId: string
): Promise<ShippingCompanyDetail | null> {
  if (!isUuid(publicId)) return null

  const [row] = await db
    .select({
      id: shippingCompany.id,
      publicId: shippingCompany.publicId,
      name: shippingCompany.name,
      description: shippingCompany.description,
      website: shippingCompany.website,
      minWeightKg: shippingCompany.minWeightKg,
      minVolumeM3: shippingCompany.minVolumeM3,
      createdAt: shippingCompany.createdAt,
      updatedAt: shippingCompany.updatedAt,
      createdBy: shippingCompany.createdBy,
      lastUpdatedBy: shippingCompany.lastUpdatedBy,
      code: currency.code,
      symbol: currency.symbol,
      currencyPublicId: currency.publicId,
    })
    .from(shippingCompany)
    .innerJoin(currency, eq(shippingCompany.baseCurrencyId, currency.id))
    .where(eq(shippingCompany.publicId, publicId))
    .limit(1)
  if (!row) return null

  const planRows = await db
    .select()
    .from(shippingPlan)
    .where(eq(shippingPlan.shippingCompanyId, row.id))
    .orderBy(asc(shippingPlan.name))

  const planIds = planRows.map((p) => p.id)
  const tierRows = planIds.length
    ? await db
        .select()
        .from(shippingRate)
        .where(inArray(shippingRate.planId, planIds))
        .orderBy(asc(shippingRate.sortOrder), asc(shippingRate.fromQty))
    : []

  const tiersByPlan = new Map<number, ShippingRateTier[]>()
  for (const t of tierRows) {
    const list = tiersByPlan.get(t.planId) ?? []
    list.push({
      publicId: t.publicId,
      fromQty: t.fromQty,
      toQty: t.toQty,
      price: t.price,
    })
    tiersByPlan.set(t.planId, list)
  }

  const eventRows = planIds.length
    ? await db
        .select({
          publicId: shippingPlanEvent.publicId,
          planId: shippingPlanEvent.planId,
          changes: shippingPlanEvent.changes,
          reason: shippingPlanEvent.reason,
          createdAt: shippingPlanEvent.createdAt,
          actorName: userTable.name,
        })
        .from(shippingPlanEvent)
        .leftJoin(userTable, eq(shippingPlanEvent.createdBy, userTable.id))
        .where(inArray(shippingPlanEvent.planId, planIds))
        .orderBy(asc(shippingPlanEvent.createdAt))
    : []

  const eventsByPlan = new Map<number, PlanEventInfo[]>()
  for (const e of eventRows) {
    const list = eventsByPlan.get(e.planId) ?? []
    list.push({
      publicId: e.publicId,
      changes: e.changes,
      reason: e.reason,
      actorName: e.actorName ?? null,
      createdAt: e.createdAt.toISOString(),
    })
    eventsByPlan.set(e.planId, list)
  }

  const userIds = [row.createdBy, row.lastUpdatedBy].filter(
    (v): v is number => v != null
  )
  const names = userIds.length
    ? await db
        .select({ id: userTable.id, name: userTable.name })
        .from(userTable)
        .where(inArray(userTable.id, userIds))
    : []
  const nameById = new Map(names.map((n) => [n.id, n.name]))

  return {
    publicId: row.publicId,
    name: row.name,
    description: row.description,
    website: row.website,
    baseCurrency: {
      code: row.code,
      symbol: row.symbol,
      publicId: row.currencyPublicId,
    },
    minWeightKg: row.minWeightKg,
    minVolumeM3: row.minVolumeM3,
    plans: planRows.map((p) => ({
      publicId: p.publicId,
      name: p.name,
      description: p.description,
      destination: p.destination,
      estimatedDaysMin: p.estimatedDaysMin,
      estimatedDaysMax: p.estimatedDaysMax,
      rateMetric: p.rateMetric === "volume" ? "volume" : "weight",
      pricingMode: p.pricingMode === "per_unit" ? "per_unit" : "flat",
      includeImportTax: p.includeImportTax,
      includeExportTax: p.includeExportTax,
      includeHandlingFee: p.includeHandlingFee,
      includeInsurance: p.includeInsurance,
      tiers: tiersByPlan.get(p.id) ?? [],
      events: eventsByPlan.get(p.id) ?? [],
    })),
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

/** Resolves a company public id to its internal integer id. */
export async function resolveCompanyId(
  publicId: string
): Promise<number | null> {
  if (!isUuid(publicId)) return null
  const [row] = await db
    .select({ id: shippingCompany.id })
    .from(shippingCompany)
    .where(eq(shippingCompany.publicId, publicId))
    .limit(1)
  return row?.id ?? null
}
