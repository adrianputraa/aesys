import "server-only"

import { mkdirSync } from "node:fs"
import { createRequire } from "node:module"

import {
  drizzle as drizzlePostgres,
  type PostgresJsDatabase,
} from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { env } from "@/lib/env"

import * as schema from "./schema"

import type { PGlite } from "@electric-sql/pglite"

/**
 * Primary application database (PostgreSQL) + Drizzle. Server-only — never
 * import this from a Client Component.
 *
 * - Normal mode: postgres.js connected to `APP_DATABASE_URL`.
 * - Demo mode (`env.isDemoMode`): PGlite, an in-process WASM PostgreSQL that
 *   needs no external server. Migrations + demo seed run from `instrumentation`.
 *   PGlite is `require`d lazily so its WASM engine is only loaded in demo mode.
 *
 * Clients are cached on `globalThis` so dev HMR (and the single shared PGlite
 * instance) survive reloads.
 */
type AppDatabase = PostgresJsDatabase<typeof schema>

const globalForDb = globalThis as unknown as {
  appDbClient?: ReturnType<typeof postgres>
  pgliteClient?: PGlite
}

function createDb(): AppDatabase {
  if (env.isDemoMode) {
    // Both PGlite and its Drizzle driver are `require`d lazily so the WASM
    // engine is never loaded (or evaluated at build) outside demo mode.
    const nodeRequire = createRequire(import.meta.url)
    if (!globalForDb.pgliteClient) {
      // PGlite's own mkdir is non-recursive; ensure the data dir exists first.
      mkdirSync(env.DEMO_DATABASE_DIR, { recursive: true })
      const { PGlite } = nodeRequire(
        "@electric-sql/pglite"
      ) as typeof import("@electric-sql/pglite")
      globalForDb.pgliteClient = new PGlite(env.DEMO_DATABASE_DIR)
    }
    const { drizzle: drizzlePglite } = nodeRequire(
      "drizzle-orm/pglite"
    ) as typeof import("drizzle-orm/pglite")
    // PGlite and postgres.js expose the same Drizzle query API; the cast keeps a
    // single `db` type across the codebase and for the better-auth adapter.
    return drizzlePglite(globalForDb.pgliteClient, {
      schema,
    }) as unknown as AppDatabase
  }

  const client =
    globalForDb.appDbClient ??
    postgres(env.APP_DATABASE_URL, { prepare: false })
  if (process.env.NODE_ENV !== "production") {
    globalForDb.appDbClient = client
  }
  return drizzlePostgres(client, { schema })
}

export const db = createDb()

/** The raw PGlite client in demo mode (used by the demo migrate/seed routine). */
export function getPgliteClient(): PGlite | undefined {
  return globalForDb.pgliteClient
}

export { schema }
