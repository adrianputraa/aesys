import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

/**
 * App config database (SQLite) schema — operational/local configuration.
 *
 * A simple key/value settings store as a starting point. Add config tables here.
 */
export const appSetting = sqliteTable("app_setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
})
