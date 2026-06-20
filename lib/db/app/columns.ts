import { timestamp } from "drizzle-orm/pg-core"

/**
 * Standard audit timestamps for app tables (project standard — see CLAUDE.md):
 * `created_at` / `updated_at` are `timestamp` (date + time) columns. `created_at`
 * defaults to now; `updated_at` defaults to now and auto-bumps on every update.
 *
 * Returned from a function so each table gets fresh column builders (Drizzle
 * builders are stateful and must not be shared between tables).
 */
export function timestamps() {
  return {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  }
}
