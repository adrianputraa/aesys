import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { NextResponse, type NextRequest } from "next/server"

import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { authorize } from "@/features/admin/server/permissions"
import { generateDescription } from "@/features/inventory/lib/describe"
import { resolveCategoryIds } from "@/features/inventory/server/categories"
import {
  item,
  itemCategory,
  itemMedia,
  itemPriceHistory,
} from "@/features/inventory/schema"
import { currency } from "@/features/admin/schema"
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

type FieldErrors = Record<string, string>

function bad(message: string, fieldErrors?: FieldErrors, status = 400) {
  return NextResponse.json({ ok: false, message, fieldErrors }, { status })
}

function intOr(value: FormDataEntryValue | null, fallback: number): number {
  if (typeof value !== "string" || value.trim() === "") return fallback
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : NaN
}

/** A prepared, validated media file ready to persist. */
type PreparedMedia = {
  type: "image" | "video"
  bytes: Buffer
  ext: string
  mimeType: string
}

export async function POST(request: NextRequest) {
  // Permission (also requires a valid session).
  const session = await authorize(PERMISSIONS.MANAGE_INVENTORY)
  if (!session) {
    return bad("You don't have permission to do that.", undefined, 403)
  }

  // CSRF: a cross-site form post would carry a foreign Origin.
  const origin = request.headers.get("origin")
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) {
        return bad("Invalid origin.", undefined, 403)
      }
    } catch {
      return bad("Invalid origin.", undefined, 403)
    }
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return bad("Could not read the upload.")
  }

  const name = String(form.get("name") ?? "").trim()
  const unit = String(form.get("unit") ?? "").trim()
  const baseCurrencyPublicId = String(form.get("baseCurrencyId") ?? "").trim()
  const basePrice = Number(form.get("basePrice"))
  const minimumOrder = intOr(form.get("minimumOrder"), 1)
  const maximumOrderRaw = String(form.get("maximumOrder") ?? "").trim()
  const maximumOrder = maximumOrderRaw === "" ? null : Number(maximumOrderRaw)
  const stock = intOr(form.get("stock"), 0)

  // Optional shipping attributes.
  const numOrNull = (key: string): number | null => {
    const s = String(form.get(key) ?? "").trim()
    if (s === "") return null
    const n = Number(s)
    return Number.isFinite(n) && n >= 0 ? n : NaN
  }
  const weightGrams = numOrNull("weightGrams")
  const lengthCm = numOrNull("lengthCm")
  const widthCm = numOrNull("widthCm")
  const heightCm = numOrNull("heightCm")
  const hsCode = String(form.get("hsCode") ?? "").trim()
  const countryOfOrigin = String(form.get("countryOfOrigin") ?? "").trim()
  const fragile = form.get("fragile") === "true"
  const hazardous = form.get("hazardous") === "true"

  let categoryPublicIds: string[] = []
  try {
    const raw = form.get("categoryIds")
    if (typeof raw === "string" && raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        categoryPublicIds = parsed.filter((v) => typeof v === "string")
      }
    }
  } catch {
    // ignore malformed categories — treated as none
  }

  // --- Validate fields ------------------------------------------------------
  const fieldErrors: FieldErrors = {}
  if (!name) fieldErrors.name = "Enter a name."
  else if (name.length > 120) fieldErrors.name = "Name is too long."
  if (!unit) fieldErrors.unit = "Enter a unit (e.g. piece, kg)."
  else if (unit.length > 32) fieldErrors.unit = "Unit is too long."
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    fieldErrors.basePrice = "Enter a price greater than 0."
  }
  if (!Number.isInteger(minimumOrder) || minimumOrder < 0) {
    fieldErrors.minimumOrder = "Minimum order must be 0 or more."
  }
  if (maximumOrder !== null) {
    if (!Number.isInteger(maximumOrder) || maximumOrder < 1) {
      fieldErrors.maximumOrder = "Maximum order must be at least 1."
    } else if (minimumOrder > 0 && maximumOrder < minimumOrder) {
      fieldErrors.maximumOrder = "Maximum can't be less than minimum."
    }
  }
  if (!Number.isInteger(stock) || stock < 0) {
    fieldErrors.stock = "Stock must be 0 or more."
  }
  if (!baseCurrencyPublicId) {
    fieldErrors.baseCurrencyId = "Choose a base currency."
  }
  for (const [key, val] of [
    ["weightGrams", weightGrams],
    ["lengthCm", lengthCm],
    ["widthCm", widthCm],
    ["heightCm", heightCm],
  ] as const) {
    if (Number.isNaN(val)) fieldErrors[key] = "Use a number (0 or more)."
  }
  if (hsCode.length > 32) fieldErrors.hsCode = "HS code is too long."
  if (countryOfOrigin.length > 64) {
    fieldErrors.countryOfOrigin = "Country is too long."
  }
  if (Object.keys(fieldErrors).length > 0) {
    return bad("Check the fields below.", fieldErrors)
  }

  // Resolve base currency.
  const [baseCurrency] = await db
    .select({ id: currency.id, code: currency.code, symbol: currency.symbol })
    .from(currency)
    .where(eq(currency.publicId, baseCurrencyPublicId))
    .limit(1)
  if (!baseCurrency) {
    return bad("Check the fields below.", {
      baseCurrencyId: "Unknown currency.",
    })
  }

  // --- Validate + prepare media (before any write) --------------------------
  const files = form
    .getAll("media")
    .filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length > MAX_MEDIA_FILES) {
    return bad(`You can attach at most ${MAX_MEDIA_FILES} files.`)
  }

  const prepared: PreparedMedia[] = []
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
      // Videos are stored as-is (no transcoding — kept intentionally simple).
      prepared.push({
        type: "video",
        bytes: input,
        ext: videoExt,
        mimeType: videoExt === "webm" ? "video/webm" : "video/mp4",
      })
      continue
    }
    return bad(
      `"${file.name}" isn't a supported image or video (use PNG/JPEG/WebP or MP4/WebM).`
    )
  }

  // --- Create the item (atomic) --------------------------------------------
  const description =
    String(form.get("description") ?? "").trim() ||
    generateDescription({
      name,
      unit,
      price: basePrice,
      currencyCode: baseCurrency.code,
      currencySymbol: baseCurrency.symbol,
    })
  const actorId = Number(session.user.id)
  const categoryIds = await resolveCategoryIds(categoryPublicIds)

  let itemPublicId: string
  let itemId: number
  try {
    const result = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(item)
        .values({
          name,
          description,
          unit,
          baseCurrencyId: baseCurrency.id,
          basePrice,
          minimumOrder,
          maximumOrder,
          stock,
          weightGrams: weightGrams as number | null,
          lengthCm: lengthCm as number | null,
          widthCm: widthCm as number | null,
          heightCm: heightCm as number | null,
          hsCode: hsCode || null,
          countryOfOrigin: countryOfOrigin || null,
          fragile,
          hazardous,
          createdBy: actorId,
          lastUpdatedBy: actorId,
        })
        .returning({ id: item.id, publicId: item.publicId })

      if (categoryIds.length) {
        await tx
          .insert(itemCategory)
          .values(
            categoryIds.map((categoryId) => ({
              itemId: created.id,
              categoryId,
            }))
          )
          .onConflictDoNothing()
      }

      await tx.insert(itemPriceHistory).values({
        itemId: created.id,
        price: basePrice,
        currencyId: baseCurrency.id,
        changedBy: actorId,
      })

      return created
    })
    itemPublicId = result.publicId
    itemId = result.id
  } catch {
    return bad("Could not create the item.", undefined, 500)
  }

  // --- Persist media (files + rows) ----------------------------------------
  for (let i = 0; i < prepared.length; i++) {
    const m = prepared[i]
    try {
      const mediaPublicId = randomUUID()
      const url = await saveItemMedia(
        itemPublicId,
        mediaPublicId,
        m.bytes,
        m.ext
      )
      await db.insert(itemMedia).values({
        publicId: mediaPublicId,
        itemId,
        type: m.type,
        url,
        mimeType: m.mimeType,
        sizeBytes: m.bytes.byteLength,
        sortOrder: i,
      })
    } catch {
      // Best-effort: the item already exists; media can be re-added later.
    }
  }

  return NextResponse.json({ ok: true, publicId: itemPublicId })
}
