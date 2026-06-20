import "server-only"

import { eq } from "drizzle-orm"

import type { ActionState } from "@/features/auth/types"
import { db } from "@/lib/db/app"
import { user as userTable } from "@/lib/db/app/auth-schema"
import {
  deleteUserAvatar,
  detectImageExt,
  MAX_AVATAR_BYTES,
  saveUserAvatar,
} from "@/lib/storage"

/** Output avatars are always a square WebP of this size. */
const AVATAR_DIMENSION = 512

/**
 * Shared avatar storage logic used by both the self-service (profile) and admin
 * avatar actions. Keeping validation + compression + write + DB update in one
 * place means the security checks can't drift between the two callers.
 *
 * The server ALWAYS re-encodes the upload with sharp (square crop → WebP), so
 * every stored avatar is guaranteed small and normalized regardless of what the
 * client sent — client-side compression is only an extra network optimization,
 * never trusted. `saveUserAvatar` replaces any previous file for the user.
 *
 * `userPublicId` is the UUID for the on-disk path; `userId` is the internal
 * integer id for the DB update. Callers must authorize first.
 */
export async function storeAvatar(
  userPublicId: string,
  userId: number,
  file: FormDataEntryValue | null
): Promise<ActionState> {
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "No image was provided." }
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { status: "error", message: "That image is too large." }
  }

  const input = Buffer.from(await file.arrayBuffer())
  // Reject non-raster inputs (no SVG/HTML) before handing bytes to the decoder.
  if (!detectImageExt(input)) {
    return {
      status: "error",
      message: "Unsupported file. Use a PNG, JPEG, or WebP image.",
    }
  }

  // Server-side compression guarantee: re-encode to a square WebP. `sharp` is
  // imported lazily (native module kept out of the build graph).
  let webp: Buffer
  try {
    const { default: sharp } = await import("sharp")
    webp = await sharp(input)
      .rotate() // apply EXIF orientation
      .resize(AVATAR_DIMENSION, AVATAR_DIMENSION, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 80 })
      .toBuffer()
  } catch {
    return { status: "error", message: "Could not process the image." }
  }

  let url: string
  try {
    url = await saveUserAvatar(userPublicId, webp, "webp")
  } catch {
    return { status: "error", message: "Could not save the image." }
  }

  // Cache-busting version so the new image shows immediately.
  await db
    .update(userTable)
    .set({ image: `${url}?v=${Date.now()}`, updatedAt: new Date() })
    .where(eq(userTable.id, userId))

  return { status: "success", message: "Profile photo updated." }
}

export async function clearAvatar(
  userPublicId: string,
  userId: number
): Promise<ActionState> {
  try {
    await deleteUserAvatar(userPublicId)
  } catch {
    // Best-effort file cleanup; still clear the column below.
  }

  await db
    .update(userTable)
    .set({ image: null, updatedAt: new Date() })
    .where(eq(userTable.id, userId))

  return { status: "success", message: "Profile photo removed." }
}
