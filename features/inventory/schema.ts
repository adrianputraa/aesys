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

import { currency } from "@/features/admin/schema"
import { user } from "@/lib/db/app/auth-schema"
import { timestamps } from "@/lib/db/app/columns"

/**
 * Inventory categories / tags. Items link to these many-to-many via
 * `item_category`. `name` is unique (case is preserved; uniqueness is enforced
 * case-insensitively in the create action).
 */
export const category = pgTable("category", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdBy: integer("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  ...timestamps(),
})

/**
 * An inventory item. `base_price` is expressed in the item's own base currency
 * (`base_currency_id`); convert to any other currency via the FX rates
 * (features/admin/lib/fx.ts). `minimum_order` of 0 marks the item unsellable;
 * `maximum_order` null means no cap.
 */
export const item = pgTable("item", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  unit: text("unit").notNull(),
  baseCurrencyId: integer("base_currency_id")
    .notNull()
    .references(() => currency.id, { onDelete: "restrict" }),
  basePrice: doublePrecision("base_price").notNull(),
  minimumOrder: integer("minimum_order").notNull().default(1),
  maximumOrder: integer("maximum_order"), // null = no maximum
  stock: integer("stock").notNull().default(0),
  // --- Shipping attributes (optional; used by the shipping/order modules) ---
  /** Net weight per unit, in grams. */
  weightGrams: doublePrecision("weight_grams"),
  /** Package dimensions per unit, in centimetres (volume is derived L×W×H). */
  lengthCm: doublePrecision("length_cm"),
  widthCm: doublePrecision("width_cm"),
  heightCm: doublePrecision("height_cm"),
  /** Harmonized System code + origin for international customs. */
  hsCode: text("hs_code"),
  countryOfOrigin: text("country_of_origin"),
  fragile: boolean("fragile").notNull().default(false),
  hazardous: boolean("hazardous").notNull().default(false),
  /** Who added the item / last changed it (internal user ids). */
  createdBy: integer("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  lastUpdatedBy: integer("last_updated_by").references(() => user.id, {
    onDelete: "set null",
  }),
  ...timestamps(),
})

/** Many-to-many item ↔ category. At most one row per (item, category). */
export const itemCategory = pgTable(
  "item_category",
  {
    id: serial("id").primaryKey(),
    itemId: integer("item_id")
      .notNull()
      .references(() => item.id, { onDelete: "cascade" }),
    categoryId: integer("category_id")
      .notNull()
      .references(() => category.id, { onDelete: "cascade" }),
  },
  (table) => [unique("item_category_unique").on(table.itemId, table.categoryId)]
)

/** Uploaded images / videos for an item (stored under public/inventory/…). */
export const itemMedia = pgTable("item_media", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  itemId: integer("item_id")
    .notNull()
    .references(() => item.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "image" | "video"
  url: text("url").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps(),
})

/**
 * Append-only log of an item's base price (in its base currency at the time).
 * Seeded on creation and appended on every price change, so the item detail can
 * chart historical pricing.
 */
export const itemPriceHistory = pgTable("item_price_history", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  itemId: integer("item_id")
    .notNull()
    .references(() => item.id, { onDelete: "cascade" }),
  price: doublePrecision("price").notNull(),
  currencyId: integer("currency_id")
    .notNull()
    .references(() => currency.id, { onDelete: "restrict" }),
  changedBy: integer("changed_by").references(() => user.id, {
    onDelete: "set null",
  }),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  ...timestamps(),
})
