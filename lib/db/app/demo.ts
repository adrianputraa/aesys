import "server-only"

import { rmSync } from "node:fs"

import { drizzle as drizzlePglite } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"

import { db, getPgliteClient, schema } from "@/lib/db/app"
import { user as userTable } from "@/lib/db/app/auth-schema"
import { DEMO_ACCOUNTS } from "@/lib/demo"
import { env } from "@/lib/env"

/**
 * One-time setup for the embedded demo database: apply migrations, then seed
 * the demo accounts. Idempotent and cached, and triggered from
 * `instrumentation.ts` (which runs once before the server serves requests).
 */
let initPromise: Promise<void> | undefined

export function initDemoDatabase(): Promise<void> {
  if (!env.isDemoMode) return Promise.resolve()
  initPromise ??= runInit()
  return initPromise
}

async function runInit(): Promise<void> {
  const client = getPgliteClient()
  if (!client) return

  // Apply the Drizzle migrations to PGlite (tracked, so it's safe to re-run).
  const migrateDb = drizzlePglite(client, { schema })
  try {
    await migrate(migrateDb, { migrationsFolder: "drizzle/app" })
  } catch (error) {
    // PGlite is a single-process, file-backed database; an unclean shutdown
    // (or a build that opened it concurrently) can corrupt its data dir, after
    // which the first query fails. The demo DB is disposable, so reset it and
    // ask for a restart rather than crashing cryptically on every boot.
    await client.close().catch(() => {})
    try {
      rmSync(env.DEMO_DATABASE_DIR, { recursive: true, force: true })
    } catch {
      // best-effort; surface the clear message regardless
    }
    throw new Error(
      `The embedded demo database at "${env.DEMO_DATABASE_DIR}" was unreadable ` +
        `(likely corrupted by an unclean shutdown) and has been reset. Restart ` +
        `\`pnpm dev\` to recreate and seed it.\nOriginal error: ` +
        (error instanceof Error ? error.message : String(error))
    )
  }

  await seedDemoAccounts()
  console.log("[demo] embedded database ready")
}

async function seedDemoAccounts(): Promise<void> {
  const existing = await db
    .select({ id: userTable.id })
    .from(userTable)
    .limit(1)
  if (existing.length > 0) return // already seeded

  // Imported lazily so this module can be loaded before the auth instance.
  const { auth } = await import("@/lib/auth")

  for (const account of DEMO_ACCOUNTS) {
    try {
      // `createUser` may be called without request headers for seeding.
      await auth.api.createUser({
        body: {
          email: account.email,
          password: account.password,
          name: account.name,
          role: account.role,
        },
      })
    } catch (error) {
      console.error(`[demo] failed to seed ${account.email}:`, error)
    }
  }
  console.log(`[demo] seeded ${DEMO_ACCOUNTS.length} demo accounts`)
}
