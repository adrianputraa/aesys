import "server-only"

import { PERMISSION_CATALOG } from "@/features/admin/lib/permissions-catalog"
import { permission } from "@/features/admin/schema"
import { db } from "@/lib/db/app"

/**
 * Seeds the permission catalog into the DB on startup (called from
 * `instrumentation`). Idempotent: existing permissions (matched by the unique
 * `value`) are left untouched — only missing ones are inserted.
 */
export async function seedPermissions(): Promise<void> {
  try {
    let added = 0
    for (const def of PERMISSION_CATALOG) {
      const inserted = await db
        .insert(permission)
        .values({
          name: def.name,
          description: def.description,
          value: def.value,
          baseRole: def.baseRole,
        })
        .onConflictDoNothing({ target: permission.value })
        .returning({ id: permission.id })
      if (inserted.length > 0) added++
    }
    if (added > 0) {
      console.log(`[permissions] seeded ${added} new permission(s)`)
    }
  } catch (error) {
    console.error(
      "[permissions] seeding skipped (is the database migrated?):",
      error instanceof Error ? error.message : error
    )
  }
}
