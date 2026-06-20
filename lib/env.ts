import "server-only"

/**
 * Server-side environment access. Importing this from a Client Component throws
 * (via `server-only`), so secrets never leak into the client bundle.
 *
 * Next.js loads `.env`, `.env.local`, etc. into `process.env` automatically — see
 * `node_modules/next/dist/docs/01-app/.../03-environment-variables.md`.
 */

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function bool(value: string | undefined): boolean {
  return value === "true" || value === "1" || value === "yes"
}

/**
 * Demo mode runs against an embedded PostgreSQL (PGlite, in-process WASM) — no
 * external database to install. Enabled explicitly with `DEMO_MODE=true`, or
 * implicitly when `APP_DATABASE_URL` is not set.
 */
const isDemoMode = bool(process.env.DEMO_MODE) || !process.env.APP_DATABASE_URL

// A fixed low-entropy secret so the demo runs with zero config. NEVER used when
// a real `BETTER_AUTH_SECRET` is provided or outside demo mode.
const DEMO_SECRET = "demo-only-insecure-secret-change-me-0123456789"

export const env = {
  /** True when using the embedded PGlite database (no external Postgres). */
  isDemoMode,
  /** PostgreSQL connection string — primary application database + auth. */
  APP_DATABASE_URL: isDemoMode
    ? (process.env.APP_DATABASE_URL ?? "")
    : required("APP_DATABASE_URL"),
  /** Directory for the embedded demo database (persisted across restarts). */
  DEMO_DATABASE_DIR: process.env.DEMO_DATABASE_DIR ?? "./.data/demo-pg",
  /** SQLite file path — operational/local app config. */
  CONFIG_DATABASE_URL: process.env.CONFIG_DATABASE_URL ?? "./.data/config.db",
  /** better-auth signing secret. Generate with `openssl rand -base64 32`. */
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ||
    (isDemoMode ? DEMO_SECRET : required("BETTER_AUTH_SECRET")),
  /** Public origin used by better-auth (cookies, redirects). */
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
} as const
