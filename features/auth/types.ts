/**
 * Shared auth types used across the server/client boundary. Keep this file free
 * of server-only imports so both Server and Client Components can import it.
 */

/** Field-level validation errors, keyed by form field name. */
export type FieldErrors = Partial<Record<string, string>>

/**
 * Return shape for every auth Server Action, designed for `useActionState`.
 * Actions that finish by navigating (sign-in/sign-up) only ever return the
 * `error` variant — on success they `redirect()` instead.
 */
export type ActionState = {
  status: "idle" | "error" | "success"
  message?: string
  fieldErrors?: FieldErrors
}

export const idleActionState: ActionState = { status: "idle" }

/**
 * A single active session, shaped for the client. Deliberately omits the
 * session **token** (a bearer credential) AND the internal integer id — the UI
 * references sessions by their `publicId` (UUID), and the server resolves
 * `publicId -> token` when revoking.
 */
export type SessionInfo = {
  publicId: string
  /** True for the session making the current request (cannot be self-revoked). */
  isCurrent: boolean
  ipAddress: string | null
  /** ISO timestamps (Date is not serializable across the RSC boundary). */
  createdAt: string
  expiresAt: string
  /** Parsed from the stored user-agent string. */
  device: DeviceInfo
}

export type DeviceInfo = {
  browser: string
  os: string
  /** "mobile" | "tablet" | "desktop" | ... (from Next's `userAgent` parser). */
  deviceType: string
  /** Human label, e.g. "Chrome on macOS". */
  label: string
}
