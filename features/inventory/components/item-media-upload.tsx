"use client"

import { FilmIcon, UploadIcon, XIcon } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

const MAX_IMAGE = 12 * 1024 * 1024
const MAX_VIDEO = 50 * 1024 * 1024
const MAX_FILES = 10

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(n / 1024))} KB`
}

/**
 * Picks images/videos for a new item. Validates type and size client-side
 * (images ≤ 12 MB, videos ≤ 50 MB); the server re-validates and re-encodes
 * images. Videos are uploaded as-is (no transcoding). Preview object-URLs live
 * in state (read during render); the ref is only touched in handlers/cleanup so
 * URLs are revoked on unmount.
 */
export function ItemMediaUpload({
  media,
  onChange,
}: {
  media: File[]
  onChange: (files: File[]) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [urls, setUrls] = React.useState<Map<File, string>>(new Map())
  const urlsRef = React.useRef(urls)

  function commitUrls(next: Map<File, string>) {
    urlsRef.current = next
    setUrls(next)
  }

  React.useEffect(() => {
    return () => {
      for (const url of urlsRef.current.values()) URL.revokeObjectURL(url)
    }
  }, [])

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ""
    const accepted: File[] = []
    for (const file of picked) {
      const isImage = file.type.startsWith("image/")
      const isVideo = file.type.startsWith("video/")
      if (!isImage && !isVideo) {
        toast.error(`"${file.name}" isn't an image or video.`)
        continue
      }
      if (isImage && file.size > MAX_IMAGE) {
        toast.error(`"${file.name}" is larger than 12 MB.`)
        continue
      }
      if (isVideo && file.size > MAX_VIDEO) {
        toast.error(`"${file.name}" is larger than 50 MB.`)
        continue
      }
      accepted.push(file)
    }
    const room = MAX_FILES - media.length
    if (accepted.length > room) {
      toast.error(`You can attach at most ${MAX_FILES} files.`)
      accepted.length = Math.max(0, room)
    }
    if (!accepted.length) return
    const next = new Map(urls)
    for (const file of accepted) next.set(file, URL.createObjectURL(file))
    commitUrls(next)
    onChange([...media, ...accepted])
  }

  function remove(file: File) {
    const url = urls.get(file)
    if (url) URL.revokeObjectURL(url)
    const next = new Map(urls)
    next.delete(file)
    commitUrls(next)
    onChange(media.filter((f) => f !== file))
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm"
        multiple
        hidden
        onChange={onPick}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={media.length >= MAX_FILES}
        className="w-fit"
      >
        <UploadIcon />
        Add images / videos
      </Button>

      {media.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((file, i) => {
            const isVideo = file.type.startsWith("video/")
            const url = urls.get(file)
            return (
              <li
                key={`${file.name}-${i}`}
                className="group relative overflow-hidden rounded-lg bg-muted"
              >
                <div className="flex aspect-video items-center justify-center">
                  {isVideo ? (
                    <video src={url} className="size-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={file.name}
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <div className="flex items-center justify-between gap-1 px-2 py-1 text-xs">
                  <span className="flex min-w-0 items-center gap-1">
                    {isVideo ? <FilmIcon className="size-3 shrink-0" /> : null}
                    <span className="truncate">{file.name}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatBytes(file.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(file)}
                  aria-label={`Remove ${file.name}`}
                  className="absolute top-1 right-1 rounded-full bg-background/80 p-1 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <XIcon className="size-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          PNG, JPEG, or WebP images (≤ 12 MB) and MP4 / WebM videos (≤ 50 MB).
        </p>
      )}
    </div>
  )
}
