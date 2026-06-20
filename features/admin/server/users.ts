import "server-only"

import { and, count, desc, eq, ilike, or } from "drizzle-orm"

import { parseUserAgent } from "@/features/auth/lib/user-agent"
import { isUuid } from "@/features/auth/lib/validation"
import type {
  AdminSessionInfo,
  AdminUserDetail,
  AdminUserRow,
  ListUsersResult,
} from "@/features/admin/types"
import { db } from "@/lib/db/app"
import {
  session as sessionTable,
  user as userTable,
} from "@/lib/db/app/auth-schema"
import { ROLES } from "@/lib/permissions"

const DEFAULT_PAGE_SIZE = 20

/** Escapes LIKE wildcards so user input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&")
}

/** Resolves a public UUID to the internal integer user id (server-side only). */
export async function resolveUserId(publicId: string): Promise<number | null> {
  if (!isUuid(publicId)) return null
  const [row] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.publicId, publicId))
    .limit(1)
  return row?.id ?? null
}

export type ListUsersParams = {
  search?: string
  searchField?: "name" | "email"
  role?: string
  page?: number
  pageSize?: number
}

/**
 * Searchable, filterable, paginated user list for the admin module. Reads
 * directly from the DB (the route is already gated by `requireAdmin`).
 */
export async function listUsers(
  params: ListUsersParams
): Promise<ListUsersResult> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE))

  const conditions = []
  const query = params.search?.trim()
  if (query) {
    const term = `%${escapeLike(query)}%`
    if (params.searchField === "name") {
      conditions.push(ilike(userTable.name, term))
    } else if (params.searchField === "email") {
      conditions.push(ilike(userTable.email, term))
    } else {
      conditions.push(
        or(ilike(userTable.name, term), ilike(userTable.email, term))
      )
    }
  }
  if (params.role && (ROLES as readonly string[]).includes(params.role)) {
    conditions.push(eq(userTable.role, params.role))
  }
  const where = conditions.length ? and(...conditions) : undefined

  const [{ total }] = await db
    .select({ total: count() })
    .from(userTable)
    .where(where)

  const rows = await db
    .select({
      publicId: userTable.publicId,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      emailVerified: userTable.emailVerified,
      banned: userTable.banned,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .where(where)
    .orderBy(desc(userTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize)

  const users: AdminUserRow[] = rows.map((r) => ({
    publicId: r.publicId,
    name: r.name,
    email: r.email,
    role: r.role,
    emailVerified: r.emailVerified,
    banned: r.banned ?? false,
    createdAt: r.createdAt.toISOString(),
  }))

  return { users, total: Number(total), page, pageSize }
}

/** Full user record for the detail page (omits the internal integer id). */
export async function getUserDetailByPublicId(
  publicId: string
): Promise<AdminUserDetail | null> {
  if (!isUuid(publicId)) return null
  const [u] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.publicId, publicId))
    .limit(1)
  if (!u) return null

  return {
    publicId: u.publicId,
    name: u.name,
    email: u.email,
    emailVerified: u.emailVerified,
    image: u.image ?? null,
    role: u.role ?? null,
    banned: u.banned ?? false,
    banReason: u.banReason ?? null,
    banExpires: u.banExpires ? u.banExpires.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }
}

/** Active sessions for a user (by public id), shaped for the admin detail page. */
export async function listSessionsForUserPublicId(
  publicId: string
): Promise<AdminSessionInfo[]> {
  const userId = await resolveUserId(publicId)
  if (userId == null) return []

  const now = new Date()
  const rows = await db
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.userId, userId))
    .orderBy(desc(sessionTable.createdAt))

  return rows
    .filter((s) => s.expiresAt > now)
    .map((s) => ({
      publicId: s.publicId,
      ipAddress: s.ipAddress ?? null,
      userAgent: s.userAgent ?? null,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      device: parseUserAgent(s.userAgent),
      impersonatedBy: s.impersonatedBy ?? null,
    }))
}
