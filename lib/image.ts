import "server-only"

/**
 * Shared server-side image compression. Used for user avatars and inventory
 * item images so the re-encode pipeline (and thus the "the server always
 * normalizes uploads" guarantee) lives in one place. `sharp` is imported lazily
 * so the native module stays out of the build graph (see `serverExternalPackages`).
 *
 * Always re-encodes to WebP. `square: true` center-crops to `maxDim × maxDim`
 * (avatars); otherwise the image is fit within `maxDim` preserving aspect ratio
 * (item photos). Throws if the bytes can't be decoded — callers handle it.
 */
export async function compressImageToWebp(
  input: Buffer,
  opts: { maxDim: number; square?: boolean; quality?: number }
): Promise<Buffer> {
  const { default: sharp } = await import("sharp")
  const quality = opts.quality ?? 80
  const pipeline = sharp(input).rotate() // apply EXIF orientation

  if (opts.square) {
    pipeline.resize(opts.maxDim, opts.maxDim, {
      fit: "cover",
      position: "centre",
    })
  } else {
    pipeline.resize(opts.maxDim, opts.maxDim, {
      fit: "inside",
      withoutEnlargement: true,
    })
  }

  return pipeline.webp({ quality }).toBuffer()
}
