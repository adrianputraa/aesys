import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  uuid,
} from "drizzle-orm/pg-core"

import { currency } from "@/features/admin/schema"
import { item } from "@/features/inventory/schema"
import { shippingPlan } from "@/features/shipping/schema"
import { user } from "@/lib/db/app/auth-schema"
import { timestamps } from "@/lib/db/app/columns"

/**
 * A sales order. `order_code` is the algorithmic, human-facing identifier shown
 * on the invoice (distinct from the integer `id` and the UUID `public_id`).
 *
 * Money: line items + fees are totalled in `order_currency_id`. The buyer pays
 * `paid_amount` in `paid_currency_id`; the invoice converts between the two when
 * they differ. Shipping/company/plan names + totals are snapshotted so a past
 * order/invoice stays stable even if the item, plan, or rates change later.
 */
export const order = pgTable("order", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  orderCode: text("order_code").notNull().unique(),

  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email"),
  buyerPhone: text("buyer_phone"),
  buyerAddress: text("buyer_address"),
  buyerCountry: text("buyer_country"),

  orderCurrencyId: integer("order_currency_id")
    .notNull()
    .references(() => currency.id, { onDelete: "restrict" }),
  paidCurrencyId: integer("paid_currency_id")
    .notNull()
    .references(() => currency.id, { onDelete: "restrict" }),
  paidAmount: doublePrecision("paid_amount").notNull().default(0),
  /** Pre-order: the buyer pays a down-payment (`paid_amount`) up front. */
  isPreOrder: boolean("is_pre_order").notNull().default(false),

  itemsSubtotal: doublePrecision("items_subtotal").notNull().default(0),
  shippingFee: doublePrecision("shipping_fee").notNull().default(0),
  grandTotal: doublePrecision("grand_total").notNull().default(0),

  shippingPlanId: integer("shipping_plan_id").references(
    () => shippingPlan.id,
    {
      onDelete: "set null",
    }
  ),
  shippingCompanyName: text("shipping_company_name"),
  shippingPlanName: text("shipping_plan_name"),
  destination: text("destination"),
  isInternational: boolean("is_international").notNull().default(false),
  totalWeightKg: doublePrecision("total_weight_kg").notNull().default(0),
  totalVolumeM3: doublePrecision("total_volume_m3").notNull().default(0),

  /** Current timeline stage key (see features/sales/lib/stages.ts). */
  status: text("status").notNull().default("received"),
  notes: text("notes"),

  createdBy: integer("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  lastUpdatedBy: integer("last_updated_by").references(() => user.id, {
    onDelete: "set null",
  }),
  ...timestamps(),
})

/** A line item on an order (snapshotted for invoice stability). */
export const orderItem = pgTable("order_item", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  orderId: integer("order_id")
    .notNull()
    .references(() => order.id, { onDelete: "cascade" }),
  itemId: integer("item_id").references(() => item.id, {
    onDelete: "set null",
  }),
  nameSnapshot: text("name_snapshot").notNull(),
  unit: text("unit").notNull(),
  quantity: integer("quantity").notNull(),
  /** Unit price in the order's currency, snapshotted at creation. */
  unitPrice: doublePrecision("unit_price").notNull(),
  lineTotal: doublePrecision("line_total").notNull(),
  ...timestamps(),
})

/**
 * Append-only order events. `kind`:
 * - "status": a timeline stage change (`status` = new stage, `reason` = note).
 * - "modification": an admin-edited value (`field`, `old_value`, `new_value`,
 *   `reason`) — surfaced as the order's modification history.
 * - "note": a free-text note (`reason`).
 */
export const orderEvent = pgTable("order_event", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  orderId: integer("order_id")
    .notNull()
    .references(() => order.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  status: text("status"),
  field: text("field"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  reason: text("reason"),
  createdBy: integer("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  ...timestamps(),
})
