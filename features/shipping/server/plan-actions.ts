"use server"

import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { authorize } from "@/features/admin/server/permissions"
import { isUuid } from "@/features/auth/lib/validation"
import type { FieldErrors } from "@/features/auth/types"
import { generatePlanDescription } from "@/features/shipping/lib/describe-plan"
import { resolveCompanyId } from "@/features/shipping/server/companies"
import {
  type PlanChange,
  shippingPlan,
  shippingPlanEvent,
  shippingRate,
} from "@/features/shipping/schema"
import { db } from "@/lib/db/app"

export type PlanTierInput = {
  fromQty?: number | string
  toQty?: number | string | null
  price?: number | string
}

export type PlanInput = {
  name?: string
  description?: string
  destination?: string
  estimatedDaysMin?: number | string
  estimatedDaysMax?: number | string
  rateMetric?: string
  pricingMode?: string
  includeImportTax?: boolean
  includeExportTax?: boolean
  includeHandlingFee?: boolean
  includeInsurance?: boolean
  tiers?: PlanTierInput[]
}

export type CreatePlanResult =
  | { status: "success" }
  | { status: "error"; message: string; fieldErrors?: FieldErrors }

const FORBIDDEN: CreatePlanResult = {
  status: "error",
  message: "You don't have permission to do that.",
}

function optionalInt(value: unknown): number | null | undefined {
  const s = String(value ?? "").trim()
  if (s === "") return null
  const n = Number(s)
  if (!Number.isInteger(n) || n < 0) return undefined // invalid
  return n
}

export async function createPlanAction(
  companyPublicId: string,
  input: PlanInput
): Promise<CreatePlanResult> {
  const session = await authorize(PERMISSIONS.MANAGE_SHIPPING)
  if (!session) return FORBIDDEN
  if (!isUuid(companyPublicId)) {
    return { status: "error", message: "Invalid company." }
  }
  const companyId = await resolveCompanyId(companyPublicId)
  if (companyId == null) {
    return { status: "error", message: "Company not found." }
  }

  const name = String(input.name ?? "").trim()
  const destination = String(input.destination ?? "").trim()
  const rateMetric = input.rateMetric === "volume" ? "volume" : "weight"
  const pricingMode = input.pricingMode === "per_unit" ? "per_unit" : "flat"
  const estMin = optionalInt(input.estimatedDaysMin)
  const estMax = optionalInt(input.estimatedDaysMax)

  const fieldErrors: FieldErrors = {}
  if (!name) fieldErrors.name = "Enter a plan name."
  else if (name.length > 120) fieldErrors.name = "Name is too long."
  if (!destination) fieldErrors.destination = "Enter a destination."
  else if (destination.length > 80) {
    fieldErrors.destination = "Destination is too long."
  }
  if (estMin === undefined) fieldErrors.estimatedDaysMin = "Use a whole number."
  if (estMax === undefined) fieldErrors.estimatedDaysMax = "Use a whole number."
  if (
    typeof estMin === "number" &&
    typeof estMax === "number" &&
    estMax < estMin
  ) {
    fieldErrors.estimatedDaysMax = "Max can't be less than min."
  }

  // Validate tiers.
  const rawTiers = Array.isArray(input.tiers) ? input.tiers : []
  const tiers: { fromQty: number; toQty: number | null; price: number }[] = []
  for (const t of rawTiers) {
    const from = Number(t.fromQty)
    const toStr = String(t.toQty ?? "").trim()
    const to = toStr === "" ? null : Number(toStr)
    const price = Number(t.price)
    if (!Number.isFinite(from) || from < 0) continue
    if (to !== null && (!Number.isFinite(to) || to <= from)) {
      fieldErrors.tiers = "Each tier's “to” must be greater than its “from”."
      continue
    }
    if (!Number.isFinite(price) || price < 0) {
      fieldErrors.tiers = "Each tier needs a price of 0 or more."
      continue
    }
    tiers.push({ fromQty: from, toQty: to, price })
  }
  if (tiers.length === 0 && !fieldErrors.tiers) {
    fieldErrors.tiers = "Add at least one rate tier."
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Check the fields below.", fieldErrors }
  }

  tiers.sort((a, b) => a.fromQty - b.fromQty)

  const description =
    String(input.description ?? "").trim() ||
    generatePlanDescription({
      name,
      destination,
      rateMetric,
      estimatedDaysMin: estMin ?? null,
      estimatedDaysMax: estMax ?? null,
      includeImportTax: Boolean(input.includeImportTax),
      includeExportTax: Boolean(input.includeExportTax),
      includeHandlingFee: Boolean(input.includeHandlingFee),
      includeInsurance: Boolean(input.includeInsurance),
    })

  const actorId = Number(session.user.id)
  await db.transaction(async (tx) => {
    const [plan] = await tx
      .insert(shippingPlan)
      .values({
        shippingCompanyId: companyId,
        name,
        description,
        destination,
        estimatedDaysMin: estMin ?? null,
        estimatedDaysMax: estMax ?? null,
        rateMetric,
        pricingMode,
        includeImportTax: Boolean(input.includeImportTax),
        includeExportTax: Boolean(input.includeExportTax),
        includeHandlingFee: Boolean(input.includeHandlingFee),
        includeInsurance: Boolean(input.includeInsurance),
        createdBy: actorId,
        lastUpdatedBy: actorId,
      })
      .returning({ id: shippingPlan.id })

    await tx.insert(shippingRate).values(
      tiers.map((t, i) => ({
        planId: plan.id,
        fromQty: t.fromQty,
        toQty: t.toQty,
        price: t.price,
        sortOrder: i,
      }))
    )
  })

  revalidatePath(`/admin/shipping/${companyPublicId}`)
  return { status: "success" }
}

// ---------------------------------------------------------------------------
// Update a plan (bulk multi-field change with a reason → plan history)
// ---------------------------------------------------------------------------

function yn(value: boolean): string {
  return value ? "yes" : "no"
}
function describeTiers(
  tiers: { fromQty: number; toQty: number | null; price: number }[]
): string {
  return tiers
    .map((t) => `${t.fromQty}–${t.toQty ?? "∞"}: ${t.price}`)
    .join(" | ")
}

export async function updatePlanAction(
  companyPublicId: string,
  planPublicId: string,
  input: PlanInput & { reason?: string }
): Promise<CreatePlanResult> {
  const session = await authorize(PERMISSIONS.MANAGE_SHIPPING)
  if (!session) return FORBIDDEN
  if (!isUuid(planPublicId) || !isUuid(companyPublicId)) {
    return { status: "error", message: "Invalid request." }
  }

  const name = String(input.name ?? "").trim()
  const destination = String(input.destination ?? "").trim()
  const rateMetric = input.rateMetric === "volume" ? "volume" : "weight"
  const pricingMode = input.pricingMode === "per_unit" ? "per_unit" : "flat"
  const estMin = optionalInt(input.estimatedDaysMin)
  const estMax = optionalInt(input.estimatedDaysMax)
  const reason = String(input.reason ?? "").trim()

  const fieldErrors: FieldErrors = {}
  if (!name) fieldErrors.name = "Enter a plan name."
  else if (name.length > 120) fieldErrors.name = "Name is too long."
  if (!destination) fieldErrors.destination = "Enter a destination."
  if (estMin === undefined) fieldErrors.estimatedDaysMin = "Use a whole number."
  if (estMax === undefined) fieldErrors.estimatedDaysMax = "Use a whole number."
  if (!reason) fieldErrors.reason = "Please state a reason."

  const rawTiers = Array.isArray(input.tiers) ? input.tiers : []
  const tiers: { fromQty: number; toQty: number | null; price: number }[] = []
  for (const t of rawTiers) {
    const from = Number(t.fromQty)
    const toStr = String(t.toQty ?? "").trim()
    const to = toStr === "" ? null : Number(toStr)
    const price = Number(t.price)
    if (!Number.isFinite(from) || from < 0) continue
    if (to !== null && (!Number.isFinite(to) || to <= from)) {
      fieldErrors.tiers = "Each tier's “to” must be greater than its “from”."
      continue
    }
    if (!Number.isFinite(price) || price < 0) {
      fieldErrors.tiers = "Each tier needs a price of 0 or more."
      continue
    }
    tiers.push({ fromQty: from, toQty: to, price })
  }
  if (tiers.length === 0 && !fieldErrors.tiers) {
    fieldErrors.tiers = "Add at least one rate tier."
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Check the fields below.", fieldErrors }
  }
  tiers.sort((a, b) => a.fromQty - b.fromQty)

  const [current] = await db
    .select()
    .from(shippingPlan)
    .where(eq(shippingPlan.publicId, planPublicId))
    .limit(1)
  if (!current) return { status: "error", message: "Plan not found." }

  const currentTiers = await db
    .select({
      fromQty: shippingRate.fromQty,
      toQty: shippingRate.toQty,
      price: shippingRate.price,
    })
    .from(shippingRate)
    .where(eq(shippingRate.planId, current.id))
    .orderBy(asc(shippingRate.sortOrder), asc(shippingRate.fromQty))

  const description = String(input.description ?? "").trim()

  // Build the diff across all editable fields.
  const cmp: { label: string; old: string; next: string }[] = [
    { label: "Name", old: current.name, next: name },
    { label: "Description", old: current.description, next: description },
    { label: "Destination", old: current.destination, next: destination },
    {
      label: "Est. days min",
      old: String(current.estimatedDaysMin ?? ""),
      next: String(estMin ?? ""),
    },
    {
      label: "Est. days max",
      old: String(current.estimatedDaysMax ?? ""),
      next: String(estMax ?? ""),
    },
    { label: "Rate metric", old: current.rateMetric, next: rateMetric },
    { label: "Pricing mode", old: current.pricingMode, next: pricingMode },
    {
      label: "Import tax",
      old: yn(current.includeImportTax),
      next: yn(Boolean(input.includeImportTax)),
    },
    {
      label: "Export tax",
      old: yn(current.includeExportTax),
      next: yn(Boolean(input.includeExportTax)),
    },
    {
      label: "Handling fee",
      old: yn(current.includeHandlingFee),
      next: yn(Boolean(input.includeHandlingFee)),
    },
    {
      label: "Insurance",
      old: yn(current.includeInsurance),
      next: yn(Boolean(input.includeInsurance)),
    },
    {
      label: "Rate tiers",
      old: describeTiers(currentTiers),
      next: describeTiers(tiers),
    },
  ]
  const changes: PlanChange[] = cmp
    .filter((c) => c.old !== c.next)
    .map((c) => ({ field: c.label, oldValue: c.old, newValue: c.next }))

  if (changes.length === 0) {
    return { status: "error", message: "No changes to save." }
  }

  const actorId = Number(session.user.id)
  await db.transaction(async (tx) => {
    await tx
      .update(shippingPlan)
      .set({
        name,
        description,
        destination,
        estimatedDaysMin: estMin ?? null,
        estimatedDaysMax: estMax ?? null,
        rateMetric,
        pricingMode,
        includeImportTax: Boolean(input.includeImportTax),
        includeExportTax: Boolean(input.includeExportTax),
        includeHandlingFee: Boolean(input.includeHandlingFee),
        includeInsurance: Boolean(input.includeInsurance),
        lastUpdatedBy: actorId,
        updatedAt: new Date(),
      })
      .where(eq(shippingPlan.id, current.id))

    await tx.delete(shippingRate).where(eq(shippingRate.planId, current.id))
    await tx.insert(shippingRate).values(
      tiers.map((t, i) => ({
        planId: current.id,
        fromQty: t.fromQty,
        toQty: t.toQty,
        price: t.price,
        sortOrder: i,
      }))
    )

    await tx.insert(shippingPlanEvent).values({
      planId: current.id,
      changes,
      reason,
      createdBy: actorId,
    })
  })

  revalidatePath(`/admin/shipping/${companyPublicId}`)
  return { status: "success" }
}

export async function deletePlanAction(
  companyPublicId: string,
  planPublicId: string
): Promise<CreatePlanResult> {
  const session = await authorize(PERMISSIONS.MANAGE_SHIPPING)
  if (!session) return FORBIDDEN
  if (!isUuid(planPublicId)) {
    return { status: "error", message: "Invalid plan." }
  }
  await db.delete(shippingPlan).where(eq(shippingPlan.publicId, planPublicId))
  revalidatePath(`/admin/shipping/${companyPublicId}`)
  return { status: "success" }
}
