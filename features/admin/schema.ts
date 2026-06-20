import {
  integer,
  pgTable,
  serial,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

import { user } from "@/lib/db/app/auth-schema"
import { timestamps } from "@/lib/db/app/columns"

/**
 * Permission catalog. One row per permission value (seeded from
 * `features/admin/lib/permissions-catalog.ts`). `base_role` is the role that
 * inherits the permission automatically; `value` is the stable, UNIQUE key
 * checked at runtime (e.g. "administrator.page.user").
 */
export const permission = pgTable("permission", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  value: text("value").notNull().unique(),
  baseRole: text("base_role").notNull(),
  /** Internal id of the last user to change this permission's grants. */
  lastUpdatedBy: integer("last_updated_by").references(() => user.id, {
    onDelete: "set null",
  }),
  ...timestamps(),
})

/**
 * Explicit per-user grants that override role inheritance. `effect` is "allow"
 * (grant to a user without the base role) or "deny" (revoke from a user who
 * would otherwise inherit it). At most one row per (permission, user).
 */
export const permissionUser = pgTable(
  "permission_user",
  {
    id: serial("id").primaryKey(),
    publicId: uuid("public_id").notNull().unique().defaultRandom(),
    permissionId: integer("permission_id")
      .notNull()
      .references(() => permission.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    effect: text("effect").notNull(), // "allow" | "deny"
    lastUpdatedBy: integer("last_updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (table) => [
    unique("permission_user_unique").on(table.permissionId, table.userId),
  ]
)
