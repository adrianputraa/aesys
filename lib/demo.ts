import type { Role } from "@/lib/permissions"

/**
 * Demo accounts seeded into the embedded database (demo mode). Credentials are
 * intentionally public — they're shown on the sign-in page so anyone can sign
 * in and explore every role, including full admin access.
 */
export type DemoAccount = {
  email: string
  password: string
  name: string
  role: Role
  blurb: string
}

export const DEMO_PASSWORD = "demo1234"

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "admin@demo.test",
    password: DEMO_PASSWORD,
    name: "Demo Admin",
    role: "SUPER_ADMIN",
    blurb: "Full access — admin module + all settings",
  },
  {
    email: "staff@demo.test",
    password: DEMO_PASSWORD,
    name: "Demo Staff",
    role: "STAFF",
    blurb: "Staff role",
  },
  {
    email: "merchant@demo.test",
    password: DEMO_PASSWORD,
    name: "Demo Merchant",
    role: "MERCHANT",
    blurb: "Merchant role",
  },
  {
    email: "customer@demo.test",
    password: DEMO_PASSWORD,
    name: "Demo Customer",
    role: "CUSTOMER",
    blurb: "Standard user",
  },
  {
    email: "guest@demo.test",
    password: DEMO_PASSWORD,
    name: "Demo Guest",
    role: "GUEST",
    blurb: "Guest role",
  },
]

/** The account featured on the sign-in page (full access). */
export const DEMO_PRIMARY = DEMO_ACCOUNTS[0]
