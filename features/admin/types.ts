import type { DeviceInfo } from "@/features/auth/types"

/** A row in the admin users list (client-safe — no internal integer id). */
export type AdminUserRow = {
  publicId: string
  name: string
  email: string
  role: string | null
  emailVerified: boolean
  banned: boolean
  createdAt: string
}

/** Full user record for the admin detail page (every client-safe schema field). */
export type AdminUserDetail = {
  publicId: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  role: string | null
  banned: boolean
  banReason: string | null
  banExpires: string | null
  createdAt: string
  updatedAt: string
}

/** One of a user's sessions, shaped for the admin detail page. */
export type AdminSessionInfo = {
  publicId: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  expiresAt: string
  device: DeviceInfo
  impersonatedBy: string | null
}

export type ListUsersResult = {
  users: AdminUserRow[]
  total: number
  page: number
  pageSize: number
}
