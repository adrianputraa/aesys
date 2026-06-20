import "server-only"

import { mkdirSync } from "node:fs"
import { dirname } from "node:path"

import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"

import { env } from "@/lib/env"

import * as schema from "./schema"

/**
 * App config database (SQLite) via better-sqlite3 + Drizzle.
 * Server-only — never import this from a Client Component.
 *
 * Cached on `globalThis` so Next.js HMR in dev reuses one file handle.
 */
const globalForConfigDb = globalThis as unknown as {
  configDbClient: Database.Database | undefined
}

function createClient() {
  const path = env.CONFIG_DATABASE_URL
  // better-sqlite3 creates the file but not its parent directory.
  mkdirSync(dirname(path), { recursive: true })
  const sqlite = new Database(path)
  sqlite.pragma("journal_mode = WAL")
  return sqlite
}

const client = globalForConfigDb.configDbClient ?? createClient()

if (process.env.NODE_ENV !== "production") {
  globalForConfigDb.configDbClient = client
}

export const configDb = drizzle(client, { schema })

export { schema }
