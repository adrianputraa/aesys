import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
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

/**
 * Currencies for the foreign-exchange / pricing foundation. `rate` is the value
 * of the currency expressed as "units of this currency per 1 unit of the base
 * currency" (the base currency has `is_base = true` and `rate = 1`). Convert
 * A -> B with: amount * rateB / rateA (see features/admin/lib/fx.ts).
 */
export const currency = pgTable("currency", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  code: text("code").notNull().unique(), // ISO 4217 (e.g. "USD") or custom code
  name: text("name").notNull(), // "US Dollar"
  symbol: text("symbol").notNull(), // "$"
  rate: doublePrecision("rate").notNull(), // units per 1 base unit
  isBase: boolean("is_base").notNull().default(false),
  /**
   * "standard" = a recognised ISO 4217 currency, eligible for the live
   * exchange-rate API. "custom" = an admin-defined ("OTHER") currency; excluded
   * from automatic API updates — its rate is set and maintained manually.
   */
  type: text("type").notNull().default("standard"), // "standard" | "custom"
  /** Internal id of the last user to change this currency. */
  lastUpdatedBy: integer("last_updated_by").references(() => user.id, {
    onDelete: "set null",
  }),
  ...timestamps(),
})

/** Append-only log of every rate change (manual, API, or seed). */
export const currencyRateHistory = pgTable("currency_rate_history", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  currencyId: integer("currency_id")
    .notNull()
    .references(() => currency.id, { onDelete: "cascade" }),
  rate: doublePrecision("rate").notNull(),
  source: text("source").notNull(), // "manual" | "api" | "seed"
  changedBy: integer("changed_by").references(() => user.id, {
    onDelete: "set null",
  }),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  ...timestamps(),
})
