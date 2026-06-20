import "server-only"

import { randomUUID } from "node:crypto"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { admin } from "better-auth/plugins/admin"

import { db } from "@/lib/db/app"
import * as schema from "@/lib/db/app/auth-schema"
import { sendEmail } from "@/lib/email"
import { env } from "@/lib/env"
import { ac, ADMIN_ROLES, DEFAULT_ROLE, roles } from "@/lib/permissions"

/** Shown to a restricted (banned) user when they try to sign in. */
export const RESTRICTED_MESSAGE =
  "Your account is restricted. Please contact an administrator."

const isProduction = process.env.NODE_ENV === "production"

/** Auto-generated UUIDv4 `public_id` — the only identifier exposed to clients. */
const publicIdField = {
  publicId: {
    type: "string",
    required: true,
    unique: true,
    input: false, // server-controlled; clients can never set it
    defaultValue: () => randomUUID(),
  },
} as const

/**
 * better-auth server instance. Auth data is stored in the PostgreSQL app
 * database via the Drizzle adapter.
 *
 * Security posture (web-standard):
 * - httpOnly + `SameSite=lax` session cookies, marked `secure` in production.
 * - CSRF: better-auth enforces an Origin/Referer allow-list (`trustedOrigins`,
 *   auto-seeded from `baseURL` + `BETTER_AUTH_TRUSTED_ORIGINS`) on every
 *   cookie-bearing, state-changing request. Next.js also enforces a same-origin
 *   check on Server Actions. We never disable either check.
 * - Sensitive operations (revoke session, change/set password) bypass the
 *   cookie cache so a revoked session cannot keep acting from a cached cookie.
 * - Rate limiting is enabled in production (see `rateLimit`).
 * - Identifiers: internal integer `id` (server-only), public UUID `publicId`.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),

  user: { additionalFields: publicIdField },
  session: {
    additionalFields: publicIdField,
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh the session once per day
    // `freshAge` gates better-auth's `listSessions` endpoint behind a
    // "recently authenticated" check (default 24h). We disable it (0) so the
    // device/session manager always loads — the destructive endpoints
    // (revoke*, changePassword) are protected by cookie-cache bypass +
    // ownership checks + `currentPassword`, not by view-time freshness.
    freshAge: 0,
    // Cookie cache is OFF: every session read hits the DB, so session
    // revocation (device manager) and account restriction (ban) take effect
    // IMMEDIATELY on every device rather than after a cache window. Session
    // lookups are by an indexed unique token, so this is cheap.
    cookieCache: { enabled: false },
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    // Email verification needs an email transport (not configured here). Keep
    // it off so flows work out of the box; flip on once a sender is wired up.
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // "Forgot password" flow. The reset link points back to /reset-password
    // (see features/auth/server/actions.ts). Passwords are hashed with scrypt.
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    // Reset invalidates every existing session for that user (security).
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `We received a request to reset your password.\n\nReset it here (expires in 1 hour):\n${url}\n\nIf you didn't request this, you can safely ignore this email.`,
      })
    },
  },

  // Rate limiting. better-auth enables this automatically in production; the
  // rules below tighten the brute-force-sensitive endpoints. The default store
  // is in-memory (per-instance) — for multi-instance/serverless production set
  // `storage: "database"` (adds a `rateLimit` table; rerun `pnpm auth:generate`).
  rateLimit: {
    enabled: isProduction,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },

  advanced: {
    useSecureCookies: isProduction,
    database: {
      // Internal primary keys are auto-incrementing INTEGERs. The client-facing
      // identifier is `publicId` (UUIDv4); see lib/db/app/auth-schema.ts.
      generateId: "serial",
    },
  },

  plugins: [
    // Admin user-management (list/create/role/ban + per-user session control).
    // Authorization is permission-based via the access-control map in
    // `lib/permissions.ts`; ADMIN/SUPER_ADMIN are the administrator roles.
    admin({
      ac,
      roles,
      adminRoles: [...ADMIN_ROLES],
      defaultRole: DEFAULT_ROLE,
      // Message returned at sign-in for a restricted (banned) account.
      bannedUserMessage: RESTRICTED_MESSAGE,
    }),
    // `nextCookies()` MUST stay last so it can flush Set-Cookie from Server
    // Actions. Add OAuth/social providers and other plugins ABOVE it.
    nextCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
