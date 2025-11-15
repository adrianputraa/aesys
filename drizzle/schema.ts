import { sqliteTable, AnySQLiteColumn, uniqueIndex, integer, text, foreignKey, numeric } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable(
  'users',
  {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    email: text().notNull(),
    username: text().notNull(),
    password: text().notNull(),
    createdAt: text().default('sql`(CURRENT_TIMESTAMP)`'),
    updatedAt: text().default('sql`(CURRENT_TIMESTAMP)`'),
    role: text().default('USER').notNull(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)]
);

export const productCategories = sqliteTable('product_categories', {
  id: integer().primaryKey({ autoIncrement: true }).notNull(),
  name: text().notNull(),
  description: text().notNull(),
  createdAt: text().default('sql`(CURRENT_TIMESTAMP)`'),
  updatedAt: text().default('sql`(CURRENT_TIMESTAMP)`'),
  createdBy: integer().references(() => users.id, { onDelete: 'restrict' }),
});

export const products = sqliteTable(
  'products',
  {
    id: integer().primaryKey({ autoIncrement: true }).notNull(),
    name: text().notNull(),
    description: text().notNull(),
    price: numeric().default('0').notNull(),
    sku: text(),
    barcode: text(),
    status: text().default('ACTIVE').notNull(),
    stock: integer().default(0).notNull(),
    width: numeric().default('0').notNull(),
    height: numeric().default('0').notNull(),
    length: numeric().default('0').notNull(),
    weight: numeric().default('0').notNull(),
    createdAt: text().default('sql`(CURRENT_TIMESTAMP)`'),
    updatedAt: text().default('sql`(CURRENT_TIMESTAMP)`'),
    deletedAt: text(),
    categoryId: integer().references(() => productCategories.id, { onDelete: 'restrict' }),
    createdBy: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    updatedBy: integer()
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
  },
  (table) => [
    uniqueIndex('products_barcode_unique').on(table.barcode),
    uniqueIndex('products_sku_unique').on(table.sku),
  ]
);
