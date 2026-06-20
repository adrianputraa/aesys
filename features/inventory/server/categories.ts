import "server-only"

import { inArray } from "drizzle-orm"

import { isUuid } from "@/features/auth/lib/validation"
import { category } from "@/features/inventory/schema"
import { db } from "@/lib/db/app"

export type CategoryOption = {
  publicId: string
  name: string
}

/** All categories, alphabetical — for the item form's tag picker. */
export async function listCategories(): Promise<CategoryOption[]> {
  const rows = await db
    .select({ publicId: category.publicId, name: category.name })
    .from(category)
    .orderBy(category.name)
  return rows
}

/** Resolves client-supplied category public ids to internal integer ids. */
export async function resolveCategoryIds(
  publicIds: string[]
): Promise<number[]> {
  const valid = [...new Set(publicIds)].filter((id) => isUuid(id))
  if (valid.length === 0) return []
  const rows = await db
    .select({ id: category.id })
    .from(category)
    .where(inArray(category.publicId, valid))
  return rows.map((r) => r.id)
}
