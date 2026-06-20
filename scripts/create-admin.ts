/**
 * Bootstraps the first administrator. There is no public sign-up, so the very
 * first SUPER_ADMIN must be seeded here; afterwards admins create users from
 * the /admin/users module.
 *
 * Usage (fill in ADMIN_* in .env.local or pass inline):
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password' \
 *     pnpm db:app:create-admin
 *
 * Requires APP_DATABASE_URL + BETTER_AUTH_SECRET and a migrated database.
 */

// Load env BEFORE importing the auth instance (which validates env on import).
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file)
  } catch {
    // file may not exist — ignore
  }
}

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const displayName = process.env.ADMIN_NAME ?? "Administrator"

  if (!email || !password) {
    console.error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD (env or .env.local) before running."
    )
    process.exit(1)
  }

  // Dynamic import so env is populated first.
  const { auth } = await import("@/lib/auth")

  try {
    // `createUser` may be called without request headers for seeding.
    const result = await auth.api.createUser({
      body: { email, password, name: displayName, role: "SUPER_ADMIN" },
    })
    console.log(`✓ Created SUPER_ADMIN: ${result.user.email}`)
    process.exit(0)
  } catch (error) {
    const body =
      error && typeof error === "object" && "body" in error
        ? JSON.stringify((error as { body: unknown }).body)
        : String(error)
    console.error(`✗ Failed to create admin: ${body}`)
    process.exit(1)
  }
}

void main()
