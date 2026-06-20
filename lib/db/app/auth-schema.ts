import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

/**
 * better-auth core tables (PostgreSQL).
 *
 * ID convention (project standard — see CLAUDE.md):
 * - `id`         INTEGER serial primary key. INTERNAL only; used for FKs/joins
 *                and server-side references. Never put it in URLs or client APIs.
 *                Enabled via `advanced.database.generateId: "serial"` in lib/auth.ts.
 * - `public_id`  UUIDv4, the ONLY identifier exposed to the client. Auto-generated
 *                (`input:false`) by better-auth's `additionalFields` + a DB default.
 *
 * `role`, `banned`, `ban_reason`, `ban_expires`, and `session.impersonated_by`
 * are added by the better-auth admin plugin.
 *
 * Regenerate after changing auth options/plugins:
 *   pnpm dlx @better-auth/cli@latest generate --config lib/auth.ts \
 *     --output lib/db/app/auth-schema.ts
 * (Then `pnpm db:app:generate` to emit the migration.)
 */

export const user = pgTable("user", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  // Admin plugin fields.
  role: text("role"),
  banned: boolean("banned").$defaultFn(() => false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
})

export const session = pgTable("session", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: integer("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // Admin plugin field (set while an admin impersonates this user).
  impersonatedBy: text("impersonated_by"),
})

export const account = pgTable("account", {
  id: serial("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
})

export const verification = pgTable("verification", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
})
