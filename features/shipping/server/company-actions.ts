"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { currency } from "@/features/admin/schema"
import { authorize } from "@/features/admin/server/permissions"
import type { FieldErrors } from "@/features/auth/types"
import { shippingCompany } from "@/features/shipping/schema"
import { db } from "@/lib/db/app"

export type CreateCompanyResult =
  | { status: "success"; publicId: string }
  | { status: "error"; message: string; fieldErrors?: FieldErrors }

const FORBIDDEN: CreateCompanyResult = {
  status: "error",
  message: "You don't have permission to do that.",
}

export type CompanyInput = {
  name?: string
  description?: string
  website?: string
  baseCurrencyId?: string
  minWeightKg?: number | string
  minVolumeM3?: number | string
}

/** Parses an optional non-negative number ("" → null). Returns NaN on invalid. */
function optionalNonNegative(value: unknown): number | null {
  const s = String(value ?? "").trim()
  if (s === "") return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

export async function createCompanyAction(
  input: CompanyInput
): Promise<CreateCompanyResult> {
  const session = await authorize(PERMISSIONS.MANAGE_SHIPPING)
  if (!session) return FORBIDDEN

  const name = String(input.name ?? "").trim()
  const description = String(input.description ?? "").trim()
  const website = String(input.website ?? "").trim()
  const baseCurrencyPublicId = String(input.baseCurrencyId ?? "").trim()
  const minWeightKg = optionalNonNegative(input.minWeightKg)
  const minVolumeM3 = optionalNonNegative(input.minVolumeM3)

  const fieldErrors: FieldErrors = {}
  if (!name) fieldErrors.name = "Enter a name."
  else if (name.length > 120) fieldErrors.name = "Name is too long."
  if (website.length > 200) fieldErrors.website = "Website is too long."
  if (Number.isNaN(minWeightKg)) {
    fieldErrors.minWeightKg = "Use 0 or more."
  }
  if (Number.isNaN(minVolumeM3)) {
    fieldErrors.minVolumeM3 = "Use 0 or more."
  }
  if (!baseCurrencyPublicId) fieldErrors.baseCurrencyId = "Choose a currency."
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Check the fields below.", fieldErrors }
  }

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
  const [created] = await db
    .insert(shippingCompany)
    .values({
      name,
      description,
      website: website || null,
      baseCurrencyId: base.id,
      minWeightKg: minWeightKg as number | null,
      minVolumeM3: minVolumeM3 as number | null,
      createdBy: actorId,
      lastUpdatedBy: actorId,
    })
    .returning({ publicId: shippingCompany.publicId })

  revalidatePath("/admin/shipping")
  return { status: "success", publicId: created.publicId }
}
