/**
 * App database (PostgreSQL) schema barrel.
 *
 * Re-export every feature's tables here so a single `schema` object reaches the
 * Drizzle client and drizzle-kit. Feature tables live next to their feature
 * (e.g. `features/<feature>/schema.ts`); import and re-export them below.
 */
export * from "./auth-schema"
export * from "@/features/admin/schema"
export * from "@/features/inventory/schema"
export * from "@/features/shipping/schema"
export * from "@/features/sales/schema"
