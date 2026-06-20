import { randomUUID } from "node:crypto"

import { count, eq } from "drizzle-orm"
import { NextResponse, type NextRequest } from "next/server"

import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { authorize } from "@/features/admin/server/permissions"
import { isUuid } from "@/features/auth/lib/validation"
import { item, itemMedia } from "@/features/inventory/schema"
import { db } from "@/lib/db/app"
import { compressImageToWebp } from "@/lib/image"
import {
  detectImageExt,
  detectVideoExt,
  MAX_ITEM_IMAGE_BYTES,
  MAX_ITEM_VIDEO_BYTES,
  saveItemMedia,
} from "@/lib/storage"

export const runtime = "nodejs"

const MAX_MEDIA_FILES = 10

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
) {
  const session = await authorize(PERMISSIONS.MANAGE_INVENTORY)
  if (!session) return bad("You don't have permission to do that.", 403)

  const origin = request.headers.get("origin")
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return bad("Invalid origin.", 403)
      }
    } catch {
      return bad("Invalid origin.", 403)
    }
  }

  const { publicId } = await params
  if (!isUuid(publicId)) return bad("Invalid item.")

  const [target] = await db
    .select({ id: item.id })
    .from(item)
    .where(eq(item.publicId, publicId))
    .limit(1)
  if (!target) return bad("Item not found.", 404)

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return bad("Could not read the upload.")
  }

  const files = form
    .getAll("media")
    .filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length === 0) return bad("No files were provided.")

  const [{ existing }] = await db
    .select({ existing: count() })
    .from(itemMedia)
    .where(eq(itemMedia.itemId, target.id))
  if (Number(existing) + files.length > MAX_MEDIA_FILES) {
    return bad(`An item can have at most ${MAX_MEDIA_FILES} media files.`)
  }

  // Validate + prepare all files before writing anything.
  const prepared: {
    type: "image" | "video"
    bytes: Buffer
    ext: string
    mimeType: string
  }[] = []
  for (const file of files) {
    const input = Buffer.from(await file.arrayBuffer())
    const imageExt = detectImageExt(input)
    if (imageExt) {
      if (file.size > MAX_ITEM_IMAGE_BYTES) {
        return bad(`"${file.name}" is too large (images ≤ 12 MB).`)
      }
      try {
        const webp = await compressImageToWebp(input, { maxDim: 1600 })
        prepared.push({
          type: "image",
          bytes: webp,
          ext: "webp",
          mimeType: "image/webp",
        })
      } catch {
        return bad(`Could not process the image "${file.name}".`)
      }
      continue
    }
    const videoExt = detectVideoExt(input)
    if (videoExt) {
      if (file.size > MAX_ITEM_VIDEO_BYTES) {
        return bad(`"${file.name}" is too large (videos ≤ 50 MB).`)
      }
      prepared.push({
        type: "video",
        bytes: input,
        ext: videoExt,
        mimeType: videoExt === "webm" ? "video/webm" : "video/mp4",
      })
      continue
    }
    return bad(`"${file.name}" isn't a supported image or video.`)
  }

  let added = 0
  for (let i = 0; i < prepared.length; i++) {
    const m = prepared[i]
    try {
      const mediaPublicId = randomUUID()
      const url = await saveItemMedia(publicId, mediaPublicId, m.bytes, m.ext)
      await db.insert(itemMedia).values({
        publicId: mediaPublicId,
        itemId: target.id,
        type: m.type,
        url,
        mimeType: m.mimeType,
        sizeBytes: m.bytes.byteLength,
        sortOrder: Number(existing) + i,
      })
      added++
    } catch {
      // best-effort; continue with the rest
    }
  }

  return NextResponse.json({ ok: true, added })
}
