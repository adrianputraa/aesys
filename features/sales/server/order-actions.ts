"use server"

import { eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { convert } from "@/features/admin/lib/fx"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { currency } from "@/features/admin/schema"
import { authorize } from "@/features/admin/server/permissions"
import { isUuid } from "@/features/auth/lib/validation"
import type { FieldErrors } from "@/features/auth/types"
import { item } from "@/features/inventory/schema"
import { MODIFIABLE_FIELDS } from "@/features/sales/lib/modifiable"
import { generateOrderCode } from "@/features/sales/lib/order-code"
import {
  applyMinimum,
  evaluateShippingFee,
  roundMoney,
} from "@/features/sales/lib/pricing"
import {
  isValidStage,
  nextStage,
  stageLabel,
} from "@/features/sales/lib/stages"
import { order, orderEvent, orderItem } from "@/features/sales/schema"
import {
  shippingCompany,
  shippingPlan,
  shippingRate,
} from "@/features/shipping/schema"
import { db } from "@/lib/db/app"

type Result =
  | { status: "success"; publicId?: string }
  | { status: "error"; message: string; fieldErrors?: FieldErrors }

const FORBIDDEN: Result = {
  status: "error",
  message: "You don't have permission to do that.",
}

export type CreateOrderInput = {
  buyerName?: string
  buyerEmail?: string
  buyerPhone?: string
  buyerAddress?: string
  buyerCountry?: string
  orderCurrencyId?: string
  paidCurrencyId?: string
  paidAmount?: number | string
  lineItems?: { itemPublicId: string; quantity: number | string }[]
  shippingPlanId?: string
  isInternational?: boolean
  isPreOrder?: boolean
  notes?: string
}

async function resolveCurrency(publicId: string) {
  if (!isUuid(publicId)) return null
  const [c] = await db
    .select({ id: currency.id, code: currency.code, rate: currency.rate })
    .from(currency)
    .where(eq(currency.publicId, publicId))
    .limit(1)
  return c ?? null
}

export async function createOrderAction(
  input: CreateOrderInput
): Promise<Result> {
  const session = await authorize(PERMISSIONS.MANAGE_SALES)
  if (!session) return FORBIDDEN

  const buyerName = String(input.buyerName ?? "").trim()
  const paidAmount = Number(input.paidAmount ?? 0)
  const lineInputs = (input.lineItems ?? []).filter(
    (l) => l && isUuid(l.itemPublicId)
  )

  const fieldErrors: FieldErrors = {}
  if (!buyerName) fieldErrors.buyerName = "Enter the buyer's name."
  else if (buyerName.length > 120) fieldErrors.buyerName = "Name is too long."
  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    fieldErrors.paidAmount = "Enter an amount of 0 or more."
  }
  if (lineInputs.length === 0) fieldErrors.lineItems = "Add at least one item."
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Check the fields below.", fieldErrors }
  }

  const orderCcy = await resolveCurrency(String(input.orderCurrencyId ?? ""))
  if (!orderCcy) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: { orderCurrencyId: "Choose an order currency." },
    }
  }
  const paidCcy = await resolveCurrency(String(input.paidCurrencyId ?? ""))
  if (!paidCcy) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: { paidCurrencyId: "Choose a paid currency." },
    }
  }

  // Resolve items + compute line totals, weight, and volume.
  const itemPublicIds = [...new Set(lineInputs.map((l) => l.itemPublicId))]
  const itemRows = await db
    .select({
      id: item.id,
      publicId: item.publicId,
      name: item.name,
      unit: item.unit,
      basePrice: item.basePrice,
      minimumOrder: item.minimumOrder,
      maximumOrder: item.maximumOrder,
      weightGrams: item.weightGrams,
      lengthCm: item.lengthCm,
      widthCm: item.widthCm,
      heightCm: item.heightCm,
      rate: currency.rate,
    })
    .from(item)
    .innerJoin(currency, eq(item.baseCurrencyId, currency.id))
    .where(inArray(item.publicId, itemPublicIds))
  const itemByPid = new Map(itemRows.map((r) => [r.publicId, r]))

  const lines: {
    itemId: number
    name: string
    unit: string
    quantity: number
    unitPrice: number
    lineTotal: number
  }[] = []
  let itemsSubtotal = 0
  let totalWeightKg = 0
  let totalVolumeM3 = 0

  for (const li of lineInputs) {
    const it = itemByPid.get(li.itemPublicId)
    if (!it) return { status: "error", message: "An item no longer exists." }
    const qty = Number(li.quantity)
    if (!Number.isInteger(qty) || qty < 1) {
      return { status: "error", message: `Invalid quantity for ${it.name}.` }
    }
    if (it.minimumOrder === 0) {
      return { status: "error", message: `${it.name} is not sellable.` }
    }
    if (qty < it.minimumOrder) {
      return {
        status: "error",
        message: `${it.name} requires a minimum order of ${it.minimumOrder}.`,
      }
    }
    if (it.maximumOrder != null && qty > it.maximumOrder) {
      return {
        status: "error",
        message: `${it.name} allows at most ${it.maximumOrder} per order.`,
      }
    }
    const unitPrice = roundMoney(convert(it.basePrice, it.rate, orderCcy.rate))
    const lineTotal = roundMoney(unitPrice * qty)
    itemsSubtotal += lineTotal
    totalWeightKg += (it.weightGrams != null ? it.weightGrams / 1000 : 0) * qty
    totalVolumeM3 +=
      (it.lengthCm != null && it.widthCm != null && it.heightCm != null
        ? (it.lengthCm * it.widthCm * it.heightCm) / 1_000_000
        : 0) * qty
    lines.push({
      itemId: it.id,
      name: it.name,
      unit: it.unit,
      quantity: qty,
      unitPrice,
      lineTotal,
    })
  }
  itemsSubtotal = roundMoney(itemsSubtotal)

  // Resolve the shipping plan + company and evaluate the fee.
  let shippingFee = 0
  let shippingPlanIdInt: number | null = null
  let shippingCompanyName: string | null = null
  let shippingPlanName: string | null = null
  let destination: string | null = null
  let derivedInternational = false

  const planPublicId = String(input.shippingPlanId ?? "").trim()
  if (planPublicId) {
    if (!isUuid(planPublicId)) {
      return {
        status: "error",
        message: "Check the fields below.",
        fieldErrors: { shippingPlanId: "Invalid plan." },
      }
    }
    const [plan] = await db
      .select({
        id: shippingPlan.id,
        name: shippingPlan.name,
        destination: shippingPlan.destination,
        rateMetric: shippingPlan.rateMetric,
        pricingMode: shippingPlan.pricingMode,
        companyId: shippingPlan.shippingCompanyId,
      })
      .from(shippingPlan)
      .where(eq(shippingPlan.publicId, planPublicId))
      .limit(1)
    if (!plan) {
      return {
        status: "error",
        message: "Check the fields below.",
        fieldErrors: { shippingPlanId: "Plan not found." },
      }
    }
    const [company] = await db
      .select({
        name: shippingCompany.name,
        minWeightKg: shippingCompany.minWeightKg,
        minVolumeM3: shippingCompany.minVolumeM3,
        rate: currency.rate,
      })
      .from(shippingCompany)
      .innerJoin(currency, eq(shippingCompany.baseCurrencyId, currency.id))
      .where(eq(shippingCompany.id, plan.companyId))
      .limit(1)
    const tiers = await db
      .select({
        fromQty: shippingRate.fromQty,
        toQty: shippingRate.toQty,
        price: shippingRate.price,
      })
      .from(shippingRate)
      .where(eq(shippingRate.planId, plan.id))

    const metricWeight = plan.rateMetric !== "volume"
    const qty = applyMinimum(
      metricWeight ? totalWeightKg : totalVolumeM3,
      metricWeight
        ? (company?.minWeightKg ?? null)
        : (company?.minVolumeM3 ?? null)
    )
    const feeInCompanyCcy = evaluateShippingFee(
      tiers,
      plan.pricingMode === "per_unit" ? "per_unit" : "flat",
      qty
    )
    shippingFee = roundMoney(
      convert(feeInCompanyCcy, company?.rate ?? orderCcy.rate, orderCcy.rate)
    )
    shippingPlanIdInt = plan.id
    shippingCompanyName = company?.name ?? null
    shippingPlanName = plan.name
    destination = plan.destination
    derivedInternational = plan.destination
      .toLowerCase()
      .includes("international")
  }

  const isInternational = input.isInternational ?? derivedInternational
  const grandTotal = roundMoney(itemsSubtotal + shippingFee)
  const actorId = Number(session.user.id)

  // Insert with a unique order code (retry on the rare clash).
  let createdPublicId: string | null = null
  for (let attempt = 0; attempt < 5 && !createdPublicId; attempt++) {
    const orderCode = generateOrderCode()
    try {
      createdPublicId = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(order)
          .values({
            orderCode,
            buyerName,
            buyerEmail: String(input.buyerEmail ?? "").trim() || null,
            buyerPhone: String(input.buyerPhone ?? "").trim() || null,
            buyerAddress: String(input.buyerAddress ?? "").trim() || null,
            buyerCountry: String(input.buyerCountry ?? "").trim() || null,
            orderCurrencyId: orderCcy.id,
            paidCurrencyId: paidCcy.id,
            paidAmount,
            isPreOrder: Boolean(input.isPreOrder),
            itemsSubtotal,
            shippingFee,
            grandTotal,
            shippingPlanId: shippingPlanIdInt,
            shippingCompanyName,
            shippingPlanName,
            destination,
            isInternational,
            totalWeightKg: roundMoney(totalWeightKg),
            totalVolumeM3: Math.round(totalVolumeM3 * 1e6) / 1e6,
            status: "received",
            notes: String(input.notes ?? "").trim() || null,
            createdBy: actorId,
            lastUpdatedBy: actorId,
          })
          .returning({ id: order.id, publicId: order.publicId })

        await tx.insert(orderItem).values(
          lines.map((l) => ({
            orderId: created.id,
            itemId: l.itemId,
            nameSnapshot: l.name,
            unit: l.unit,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          }))
        )

        await tx.insert(orderEvent).values({
          orderId: created.id,
          kind: "status",
          status: "received",
          reason: "Order created.",
          createdBy: actorId,
        })

        return created.publicId
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : ""
      if (!/unique|duplicate/i.test(msg)) {
        return { status: "error", message: "Could not create the order." }
      }
      // else: order code clash — retry
    }
  }

  if (!createdPublicId) {
    return {
      status: "error",
      message: "Could not generate a unique order code.",
    }
  }

  revalidatePath("/admin/sales")
  return { status: "success", publicId: createdPublicId }
}

// ---------------------------------------------------------------------------
// Modify an order value (with a required reason → modification history)
// ---------------------------------------------------------------------------

const MODIFIABLE_COLUMN: Record<string, keyof typeof order.$inferInsert> = {
  buyerName: "buyerName",
  buyerEmail: "buyerEmail",
  buyerPhone: "buyerPhone",
  buyerAddress: "buyerAddress",
  buyerCountry: "buyerCountry",
  paidAmount: "paidAmount",
  shippingFee: "shippingFee",
  grandTotal: "grandTotal",
  notes: "notes",
}

export async function modifyOrderAction(
  publicId: string,
  field: string,
  newValueRaw: string,
  reason: string
): Promise<Result> {
  const session = await authorize(PERMISSIONS.MANAGE_SALES)
  if (!session) return FORBIDDEN
  if (!isUuid(publicId)) return { status: "error", message: "Invalid order." }

  const column = MODIFIABLE_COLUMN[field]
  const meta = MODIFIABLE_FIELDS.find((f) => f.key === field)
  if (!column || !meta) {
    return { status: "error", message: "That field can't be modified." }
  }
  const reasonText = reason.trim()
  if (!reasonText) {
    return {
      status: "error",
      message: "A reason is required.",
      fieldErrors: { reason: "Please state a reason." },
    }
  }

  const [row] = await db
    .select()
    .from(order)
    .where(eq(order.publicId, publicId))
    .limit(1)
  if (!row) return { status: "error", message: "Order not found." }

  const current = (row as Record<string, unknown>)[column]
  let newValue: string | number | null
  let newDisplay: string
  if (meta.type === "number") {
    const n = Number(newValueRaw)
    if (!Number.isFinite(n) || n < 0) {
      return {
        status: "error",
        message: "Enter a valid amount.",
        fieldErrors: { newValue: "Use a number (0 or more)." },
      }
    }
    newValue = n
    newDisplay = String(n)
  } else {
    const t = newValueRaw.trim()
    if (t.length > 300) {
      return {
        status: "error",
        message: "Value is too long.",
        fieldErrors: { newValue: "Too long." },
      }
    }
    newValue = t || null
    newDisplay = t
  }

  const actorId = Number(session.user.id)
  await db.transaction(async (tx) => {
    await tx
      .update(order)
      .set({
        [column]: newValue,
        lastUpdatedBy: actorId,
        updatedAt: new Date(),
      })
      .where(eq(order.id, row.id))
    await tx.insert(orderEvent).values({
      orderId: row.id,
      kind: "modification",
      field: meta.label,
      oldValue: current == null ? "" : String(current),
      newValue: newDisplay,
      reason: reasonText,
      createdBy: actorId,
    })
  })

  revalidatePath(`/admin/sales/${publicId}`)
  return { status: "success" }
}

// ---------------------------------------------------------------------------
// Timeline: advance to next stage, or set a stage manually
// ---------------------------------------------------------------------------

export async function advanceOrderStatusAction(
  publicId: string
): Promise<Result> {
  const session = await authorize(PERMISSIONS.MANAGE_SALES)
  if (!session) return FORBIDDEN
  if (!isUuid(publicId)) return { status: "error", message: "Invalid order." }

  const [row] = await db
    .select({
      id: order.id,
      status: order.status,
      isInternational: order.isInternational,
    })
    .from(order)
    .where(eq(order.publicId, publicId))
    .limit(1)
  if (!row) return { status: "error", message: "Order not found." }

  const next = nextStage(row.status, row.isInternational)
  if (!next) {
    return {
      status: "error",
      message: "The order is already at the final stage.",
    }
  }
  await applyStatus(
    row.id,
    next,
    `Advanced to "${stageLabel(next)}".`,
    Number(session.user.id)
  )
  revalidatePath(`/admin/sales/${publicId}`)
  return { status: "success" }
}

export async function setOrderStatusAction(
  publicId: string,
  status: string,
  note?: string
): Promise<Result> {
  const session = await authorize(PERMISSIONS.MANAGE_SALES)
  if (!session) return FORBIDDEN
  if (!isUuid(publicId)) return { status: "error", message: "Invalid order." }
  if (!isValidStage(status)) {
    return { status: "error", message: "Unknown stage." }
  }

  const [row] = await db
    .select({ id: order.id })
    .from(order)
    .where(eq(order.publicId, publicId))
    .limit(1)
  if (!row) return { status: "error", message: "Order not found." }

  await applyStatus(
    row.id,
    status,
    note?.trim() || `Manually set to "${stageLabel(status)}".`,
    Number(session.user.id)
  )
  revalidatePath(`/admin/sales/${publicId}`)
  return { status: "success" }
}

async function applyStatus(
  orderId: number,
  status: string,
  reason: string,
  actorId: number
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(order)
      .set({ status, lastUpdatedBy: actorId, updatedAt: new Date() })
      .where(eq(order.id, orderId))
    await tx.insert(orderEvent).values({
      orderId,
      kind: "status",
      status,
      reason,
      createdBy: actorId,
    })
  })
}
