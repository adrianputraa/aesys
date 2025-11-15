import { sql, InferSelectModel } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const usersTable = sqliteTable('users', {
  id: int().primaryKey({ autoIncrement: true }),
  email: text().notNull().unique(),
  username: text().notNull(),
  password: text().notNull(),
  role: text().$type<UserRole>().notNull().default('USER'),
  createdAt: text().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text().default(sql`CURRENT_TIMESTAMP`),
});

export type UserTableRow = InferSelectModel<typeof usersTable>;
