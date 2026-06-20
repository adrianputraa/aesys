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

const INVENTORY_ROOT = path.join(process.cwd(), "public", "inventory")
const INVENTORY_PREFIX = "/inventory"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB (after client compression)
export const MAX_ITEM_IMAGE_BYTES = 12 * 1024 * 1024 // 12 MB (re-encoded server-side)
export const MAX_ITEM_VIDEO_BYTES = 50 * 1024 * 1024 // 50 MB (stored as-is)

/** Detects the image type from magic bytes. Returns null for anything else. */
export function detectImageExt(bytes: Buffer): "webp" | "jpg" | "png" | null {
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

// ---------------------------------------------------------------------------
// Inventory item media (images re-encoded to WebP; videos stored as-is)
// ---------------------------------------------------------------------------

/** Detects a (browser-playable) video container from magic bytes. */
export function detectVideoExt(bytes: Buffer): "mp4" | "webm" | "mov" | null {
  if (bytes.length < 12) return null
  // ISO-BMFF (MP4/MOV): bytes 4..7 == "ftyp"
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    // QuickTime brand "qt  " → .mov, otherwise treat as .mp4
    const qt =
      bytes[8] === 0x71 &&
      bytes[9] === 0x74 &&
      bytes[10] === 0x20 &&
      bytes[11] === 0x20
    return qt ? "mov" : "mp4"
  }
  // WebM/Matroska (EBML): 1A 45 DF A3
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "webm"
  }
  return null
}

function itemDir(publicId: string): string {
  if (!UUID_RE.test(publicId)) {
    throw new Error("Invalid item id for storage path")
  }
  return path.join(INVENTORY_ROOT, publicId, "media")
}

/**
 * Saves one media file for an item under a UUID basename. Returns the public
 * URL path (served statically at `/inventory/<itemPublicId>/media/<id>.<ext>`).
 */
export async function saveItemMedia(
  itemPublicId: string,
  mediaPublicId: string,
  bytes: Buffer,
  ext: string
): Promise<string> {
  if (!UUID_RE.test(mediaPublicId)) {
    throw new Error("Invalid media id for storage path")
  }
  const dir = itemDir(itemPublicId)
  await mkdir(dir, { recursive: true })
  const filename = `${mediaPublicId}.${ext}`
  await writeFile(path.join(dir, filename), bytes)
  return `${INVENTORY_PREFIX}/${itemPublicId}/media/${filename}`
}

/** Deletes all stored media for an item (used when removing the item). */
export async function deleteItemMediaDir(itemPublicId: string): Promise<void> {
  if (!UUID_RE.test(itemPublicId)) return
  await rm(path.join(INVENTORY_ROOT, itemPublicId), {
    recursive: true,
    force: true,
  })
}

/** Deletes one stored media file given its public URL (e.g. on media removal). */
export async function deleteItemMediaByUrl(url: string): Promise<void> {
  if (!url.startsWith(`${INVENTORY_PREFIX}/`) || url.includes("..")) return
  const rel = url.replace(/^\//, "")
  await rm(path.join(process.cwd(), "public", rel), { force: true })
}
