"use server"

import { sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { authorize } from "@/features/admin/server/permissions"
import type { CategoryOption } from "@/features/inventory/server/categories"
import { category } from "@/features/inventory/schema"
import { db } from "@/lib/db/app"

export type CreateCategoryResult =
  | { status: "success"; category: CategoryOption }
  | { status: "error"; message: string }

/**
 * Creates a category from the inventory item form's "add category" dialog.
 * Name is required, ≤ 48 chars, and unique case-insensitively. Returns the new
 * category so the client can select it immediately.
 */
export async function createCategoryAction(input: {
  name?: string
  description?: string
}): Promise<CreateCategoryResult> {
  const session = await authorize(PERMISSIONS.MANAGE_INVENTORY)
  if (!session) {
    return { status: "error", message: "You don't have permission to do that." }
  }

  const name = String(input.name ?? "").trim()
  const description = String(input.description ?? "").trim()
  if (!name) return { status: "error", message: "Enter a category name." }
  if (name.length > 48) {
    return { status: "error", message: "Category name is too long (≤ 48)." }
  }

  // Case-insensitive uniqueness.
  const [existing] = await db
    .select({ publicId: category.publicId, name: category.name })
    .from(category)
    .where(sql`lower(${category.name}) = ${name.toLowerCase()}`)
    .limit(1)
  if (existing) {
    return { status: "error", message: `"${existing.name}" already exists.` }
  }

  const [created] = await db
    .insert(category)
    .values({
      name,
      description: description || null,
      createdBy: Number(session.user.id),
    })
    .returning({ publicId: category.publicId, name: category.name })

  revalidatePath("/admin/inventory/new")
  return { status: "success", category: created }
}
