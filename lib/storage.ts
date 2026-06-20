import "server-only"

import { mkdir, readdir, rm, unlink, writeFile } from "node:fs/promises"
import path from "node:path"

/**
 * Local file storage for user-uploaded content (avatars). Isolated here so the
 * backing store can later be swapped for object storage (S3/R2/…) without
 * touching callers. Files live under `public/user-data/<publicId>/…` and are
 * served as static assets at `/user-data/<publicId>/…`.
 *
 * NOTE: this writes to the local filesystem, which is fine for a self-hosted
 * deployment but not for read-only/ephemeral serverless filesystems — point the
 * functions below at object storage there.
 */

const STORAGE_ROOT = path.join(process.cwd(), "public", "user-data")
const PUBLIC_PREFIX = "/user-data"
const AVATAR_BASENAME = "profilePicture"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB (after client compression)

/** Detects the image type from magic bytes. Returns null for anything else. */
export function detectImageExt(
  bytes: Buffer
): "webp" | "jpg" | "png" | null {
  if (bytes.length < 12) return null
  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png"
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg"
  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp"
  }
  return null
}

/** Guards against path traversal — publicId must be a real UUID. */
function userDir(publicId: string): string {
  if (!UUID_RE.test(publicId)) {
    throw new Error("Invalid user id for storage path")
  }
  return path.join(STORAGE_ROOT, publicId)
}

async function removeExistingAvatar(dir: string): Promise<void> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return // dir doesn't exist yet
  }
  await Promise.all(
    entries
      .filter((name) => name.startsWith(`${AVATAR_BASENAME}.`))
      .map((name) => unlink(path.join(dir, name)))
  )
}

/**
 * Saves the avatar bytes for a user, replacing any previous one. Returns the
 * public URL path (without a cache-busting query — callers add that).
 */
export async function saveUserAvatar(
  publicId: string,
  bytes: Buffer,
  ext: "webp" | "jpg" | "png"
): Promise<string> {
  const dir = userDir(publicId)
  await mkdir(dir, { recursive: true })
  await removeExistingAvatar(dir)
  const filename = `${AVATAR_BASENAME}.${ext}`
  await writeFile(path.join(dir, filename), bytes)
  return `${PUBLIC_PREFIX}/${publicId}/${filename}`
}

/** Deletes all stored files for a user (used when removing the avatar). */
export async function deleteUserAvatar(publicId: string): Promise<void> {
  await rm(userDir(publicId), { recursive: true, force: true })
}
