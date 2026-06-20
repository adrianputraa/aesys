"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { currency } from "@/features/admin/schema"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { authorize } from "@/features/admin/server/permissions"
import { isUuid } from "@/features/auth/lib/validation"
import type { ActionState, FieldErrors } from "@/features/auth/types"
import {
  item,
  itemCategory,
  itemMedia,
  itemPriceHistory,
} from "@/features/inventory/schema"
import { resolveCategoryIds } from "@/features/inventory/server/categories"
import { db } from "@/lib/db/app"
import { deleteItemMediaByUrl } from "@/lib/storage"

const FORBIDDEN: ActionState = {
  status: "error",
  message: "You don't have permission to do that.",
}

const RATE_EPSILON = 1e-9

export type UpdateItemInput = {
  name?: string
  description?: string
  unit?: string
  baseCurrencyId?: string
  basePrice?: number | string
  minimumOrder?: number | string
  maximumOrder?: number | string
  stock?: number | string
  categoryIds?: string[]
  weightGrams?: number | string
  lengthCm?: number | string
  widthCm?: number | string
  heightCm?: number | string
  hsCode?: string
  countryOfOrigin?: string
  fragile?: boolean
  hazardous?: boolean
}

function numOrNull(value: unknown): number | null | undefined {
  const s = String(value ?? "").trim()
  if (s === "") return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : undefined // undefined = invalid
}

function intOr(value: unknown, fallback: number): number {
  const s = String(value ?? "").trim()
  if (s === "") return fallback
  const n = Number(s)
  return Number.isInteger(n) ? n : NaN
}

/** Updates an item's details (incl. shipping); appends price history on change. */
export async function updateItemAction(
  publicId: string,
  input: UpdateItemInput
): Promise<ActionState> {
  const session = await authorize(PERMISSIONS.MANAGE_INVENTORY)
  if (!session) return FORBIDDEN
  if (!isUuid(publicId)) return { status: "error", message: "Invalid item." }

  const name = String(input.name ?? "").trim()
  const description = String(input.description ?? "").trim()
  const unit = String(input.unit ?? "").trim()
  const baseCurrencyPublicId = String(input.baseCurrencyId ?? "").trim()
  const basePrice = Number(input.basePrice)
  const minimumOrder = intOr(input.minimumOrder, 1)
  const maximumOrderRaw = String(input.maximumOrder ?? "").trim()
  const maximumOrder = maximumOrderRaw === "" ? null : Number(maximumOrderRaw)
  const stock = intOr(input.stock, 0)
  const weightGrams = numOrNull(input.weightGrams)
  const lengthCm = numOrNull(input.lengthCm)
  const widthCm = numOrNull(input.widthCm)
  const heightCm = numOrNull(input.heightCm)
  const hsCode = String(input.hsCode ?? "").trim()
  const countryOfOrigin = String(input.countryOfOrigin ?? "").trim()

  const fieldErrors: FieldErrors = {}
  if (!name) fieldErrors.name = "Enter a name."
  else if (name.length > 120) fieldErrors.name = "Name is too long."
  if (!unit) fieldErrors.unit = "Enter a unit."
  else if (unit.length > 32) fieldErrors.unit = "Unit is too long."
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    fieldErrors.basePrice = "Enter a price greater than 0."
  }
  if (!Number.isInteger(minimumOrder) || minimumOrder < 0) {
    fieldErrors.minimumOrder = "Minimum order must be 0 or more."
  }
  if (maximumOrder !== null) {
    if (!Number.isInteger(maximumOrder) || maximumOrder < 1) {
      fieldErrors.maximumOrder = "Maximum order must be at least 1."
    } else if (minimumOrder > 0 && maximumOrder < minimumOrder) {
      fieldErrors.maximumOrder = "Maximum can't be less than minimum."
    }
  }
  if (!Number.isInteger(stock) || stock < 0) {
    fieldErrors.stock = "Stock must be 0 or more."
  }
  for (const [key, val] of [
    ["weightGrams", weightGrams],
    ["lengthCm", lengthCm],
    ["widthCm", widthCm],
    ["heightCm", heightCm],
  ] as const) {
    if (val === undefined) fieldErrors[key] = "Use a number (0 or more)."
  }
  if (hsCode.length > 32) fieldErrors.hsCode = "HS code is too long."
  if (countryOfOrigin.length > 64) {
    fieldErrors.countryOfOrigin = "Country is too long."
  }
  if (!baseCurrencyPublicId) fieldErrors.baseCurrencyId = "Choose a currency."
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Check the fields below.", fieldErrors }
  }

  const [target] = await db
    .select({ id: item.id, basePrice: item.basePrice })
    .from(item)
    .where(eq(item.publicId, publicId))
    .limit(1)
  if (!target) return { status: "error", message: "Item not found." }

  const [base] = await db
    .select({ id: currency.id })
    .from(currency)
    .where(eq(currency.publicId, baseCurrencyPublicId))
    .limit(1)
  if (!base) {
    return {
      status: "error",
      message: "Check the fields below.",
      fieldErrors: { baseCurrencyId: "Unknown currency." },
    }
  }

  const actorId = Number(session.user.id)
  const categoryIds = await resolveCategoryIds(input.categoryIds ?? [])
  const priceChanged = Math.abs(basePrice - target.basePrice) > RATE_EPSILON

  await db.transaction(async (tx) => {
    await tx
      .update(item)
      .set({
        name,
        description,
        unit,
        baseCurrencyId: base.id,
        basePrice,
        minimumOrder,
        maximumOrder,
        stock,
        weightGrams: weightGrams as number | null,
        lengthCm: lengthCm as number | null,
        widthCm: widthCm as number | null,
        heightCm: heightCm as number | null,
        hsCode: hsCode || null,
        countryOfOrigin: countryOfOrigin || null,
        fragile: Boolean(input.fragile),
        hazardous: Boolean(input.hazardous),
        lastUpdatedBy: actorId,
        updatedAt: new Date(),
      })
      .where(eq(item.id, target.id))

    // Replace category links.
    await tx.delete(itemCategory).where(eq(itemCategory.itemId, target.id))
    if (categoryIds.length) {
      await tx
        .insert(itemCategory)
        .values(
          categoryIds.map((categoryId) => ({ itemId: target.id, categoryId }))
        )
        .onConflictDoNothing()
    }

    if (priceChanged) {
      await tx.insert(itemPriceHistory).values({
        itemId: target.id,
        price: basePrice,
        currencyId: base.id,
        changedBy: actorId,
      })
    }
  })

  revalidatePath(`/admin/inventory/${publicId}`, "layout")
  revalidatePath("/admin/inventory")
  return { status: "success", message: "Item updated." }
}

/** Removes one media item (file + row) from an item. */
export async function removeItemMediaAction(
  itemPublicId: string,
  mediaPublicId: string
): Promise<ActionState> {
  if (!(await authorize(PERMISSIONS.MANAGE_INVENTORY))) return FORBIDDEN
  if (!isUuid(itemPublicId) || !isUuid(mediaPublicId)) {
    return { status: "error", message: "Invalid request." }
  }

  const [target] = await db
    .select({ id: item.id })
    .from(item)
    .where(eq(item.publicId, itemPublicId))
    .limit(1)
  if (!target) return { status: "error", message: "Item not found." }

  const [media] = await db
    .select({ id: itemMedia.id, url: itemMedia.url })
    .from(itemMedia)
    .where(
      and(
        eq(itemMedia.publicId, mediaPublicId),
        eq(itemMedia.itemId, target.id)
      )
    )
    .limit(1)
  if (!media) return { status: "error", message: "Media not found." }

  await db.delete(itemMedia).where(eq(itemMedia.id, media.id))
  try {
    await deleteItemMediaByUrl(media.url)
  } catch {
    // best-effort file cleanup
  }

  revalidatePath(`/admin/inventory/${itemPublicId}`, "layout")
  return { status: "success", message: "Media removed." }
}
