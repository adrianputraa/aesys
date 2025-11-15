import { sqliteTable, AnySQLiteColumn, uniqueIndex, integer, text } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const users = sqliteTable("users", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	email: text().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	createdAt: text().default("sql`(CURRENT_TIMESTAMP)`"),
	updatedAt: text().default("sql`(CURRENT_TIMESTAMP)`"),
},
(table) => [
	uniqueIndex("users_email_unique").on(table.email),
]);

