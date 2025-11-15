import { sql, InferSelectModel } from 'drizzle-orm';
import { int, numeric, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { usersTable } from './users';

export const productsTable = sqliteTable('products', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  description: text().notNull(),
  price: numeric().notNull().default('0'),
  sku: text().unique(),
  barcode: text().unique(),
  status: text().$type<ProductStatus>().notNull().default('ACTIVE'),

  stock: int().notNull().default(0),
  width: numeric().notNull().default('0'),
  height: numeric().notNull().default('0'),
  length: numeric().notNull().default('0'),
  weight: numeric().notNull().default('0'),

  createdAt: text().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text().default(sql`CURRENT_TIMESTAMP`),
  deletedAt: text(),

  // RELATIONS
  categoryId: int().references(() => productCategoriesTable.id, {
    onDelete: 'restrict',
  }),
  createdBy: int()
    .references(() => usersTable.id, {
      onDelete: 'restrict',
    })
    .notNull(),
  updatedBy: int()
    .references(() => usersTable.id, {
      onDelete: 'restrict',
    })
    .notNull(),
});

export const productCategoriesTable = sqliteTable('product_categories', {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  description: text().notNull(),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text().default(sql`CURRENT_TIMESTAMP`),
  createdBy: int().references(() => usersTable.id, {
    onDelete: 'restrict',
  }),
});

export type ProductTableRow = InferSelectModel<typeof productsTable>;
