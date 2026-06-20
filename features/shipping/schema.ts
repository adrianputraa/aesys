import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  uuid,
} from "drizzle-orm/pg-core"

import { currency } from "@/features/admin/schema"
import { user } from "@/lib/db/app/auth-schema"
import { timestamps } from "@/lib/db/app/columns"

/**
 * A third-party forwarder / shipping company. We don't ship ourselves — orders
 * are fulfilled through these forwarders. Each has its own base currency (rates
 * and plan prices are expressed in it) and may enforce a minimum shipping weight
 * and/or volume.
 */
export const shippingCompany = pgTable("shipping_company", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  website: text("website"),
  baseCurrencyId: integer("base_currency_id")
    .notNull()
    .references(() => currency.id, { onDelete: "restrict" }),
  /** Forwarder-enforced minimums in shipping units (kg / m³); null = none. */
  minWeightKg: doublePrecision("min_weight_kg"),
  minVolumeM3: doublePrecision("min_volume_m3"),
  createdBy: integer("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  lastUpdatedBy: integer("last_updated_by").references(() => user.id, {
    onDelete: "set null",
  }),
  ...timestamps(),
})

/**
 * A shipping plan offered by a forwarder — selected later when creating an
 * order. Priced in the company's base currency via tiered rates
 * (`shipping_rate`): `rate_metric` says whether tiers are keyed by weight (kg)
 * or volume (m³); `pricing_mode` says whether a tier's price is a flat charge
 * for the bracket or a per-unit rate. The `include_*` flags record what the
 * quoted price already bundles.
 */
export const shippingPlan = pgTable("shipping_plan", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  shippingCompanyId: integer("shipping_company_id")
    .notNull()
    .references(() => shippingCompany.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  /** Destination this plan covers, e.g. "Domestic" or "International". */
  destination: text("destination").notNull(),
  estimatedDaysMin: integer("estimated_days_min"),
  estimatedDaysMax: integer("estimated_days_max"),
  rateMetric: text("rate_metric").notNull(), // "weight" | "volume"
  pricingMode: text("pricing_mode").notNull(), // "flat" | "per_unit"
  includeImportTax: boolean("include_import_tax").notNull().default(false),
  includeExportTax: boolean("include_export_tax").notNull().default(false),
  includeHandlingFee: boolean("include_handling_fee").notNull().default(false),
  includeInsurance: boolean("include_insurance").notNull().default(false),
  createdBy: integer("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  lastUpdatedBy: integer("last_updated_by").references(() => user.id, {
    onDelete: "set null",
  }),
  ...timestamps(),
})

/**
 * A rate tier for a plan: applies to quantities in shipping units (kg for
 * `rate_metric = weight`, m³ for `volume`) in [from_qty, to_qty). `to_qty` null
 * means open-ended. `price` is in the company's base currency, interpreted per
 * the plan's `pricing_mode` (a flat charge for the bracket, or a per-kg / per-m³
 * rate). Item weights (grams) / volumes (cm³) convert to kg / m³ at evaluation.
 */
export const shippingRate = pgTable("shipping_rate", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  planId: integer("plan_id")
    .notNull()
    .references(() => shippingPlan.id, { onDelete: "cascade" }),
  fromQty: doublePrecision("from_qty").notNull().default(0),
  toQty: doublePrecision("to_qty"), // null = open-ended
  price: doublePrecision("price").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps(),
})

export type PlanChange = { field: string; oldValue: string; newValue: string }

/**
 * Append-only log of plan edits. Unlike the order modification log (one value
 * per event), a plan edit can change several values at once, so `changes` holds
 * the full set of field old→new diffs for that bulk update, with a reason.
 */
export const shippingPlanEvent = pgTable("shipping_plan_event", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  planId: integer("plan_id")
    .notNull()
    .references(() => shippingPlan.id, { onDelete: "cascade" }),
  changes: jsonb("changes").notNull().$type<PlanChange[]>(),
  reason: text("reason"),
  createdBy: integer("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  ...timestamps(),
})
