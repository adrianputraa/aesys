/**
 * Next.js instrumentation. `register()` runs once when a server instance starts
 * and completes before the first request is served — the right place to migrate
 * and seed the embedded demo database (no-op outside demo mode).
 *
 * See: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md
 */
export async function register() {
  // PGlite needs Node APIs; skip the edge runtime.
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  // Demo mode: migrate + seed demo accounts (no-op otherwise).
  const { initDemoDatabase } = await import("@/lib/db/app/demo")
  await initDemoDatabase()

  // Always: seed the permission catalog (idempotent).
  const { seedPermissions } = await import("@/lib/db/app/seed-permissions")
  await seedPermissions()
}
