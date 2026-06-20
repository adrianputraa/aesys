/**
 * Client-side avatar compression. Center-crops to a square, downscales to at
 * most `size`px, and re-encodes as WebP — which strips EXIF/metadata and shrinks
 * a multi-MB photo to tens of KB before it ever touches the network. Runs in the
 * browser only (uses Canvas + createImageBitmap).
 */
export const AVATAR_SIZE = 512
export const AVATAR_QUALITY = 0.82

export async function compressAvatar(
  file: File,
  size = AVATAR_SIZE,
  quality = AVATAR_QUALITY
): Promise<Blob> {
  // `imageOrientation: "from-image"` applies EXIF rotation so phone photos
  // aren't sideways.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  })

  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const sx = (bitmap.width - side) / 2
    const sy = (bitmap.height - side) / 2
    const target = Math.min(size, side)

    const canvas = document.createElement("canvas")
    canvas.width = target
    canvas.height = target
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not supported")
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    )
    if (!blob) throw new Error("Could not process image")
    return blob
  } finally {
    bitmap.close()
  }
}
