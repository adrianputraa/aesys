"use client"

import { FilmIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { ResponsiveConfirm } from "@/components/responsive-confirm"
import { Button } from "@/components/ui/button"
import { ItemMediaUpload } from "@/features/inventory/components/item-media-upload"
import { removeItemMediaAction } from "@/features/inventory/server/item-actions"
import type { ItemMediaInfo } from "@/features/inventory/server/items"

export function ItemMediaManager({
  itemPublicId,
  media,
}: {
  itemPublicId: string
  media: ItemMediaInfo[]
}) {
  const router = useRouter()
  const [newFiles, setNewFiles] = React.useState<File[]>([])
  const [busy, setBusy] = React.useState(false)

  function remove(mediaPublicId: string) {
    setBusy(true)
    removeItemMediaAction(itemPublicId, mediaPublicId).then((result) => {
      setBusy(false)
      if (result.status === "success") {
        toast.success("Media removed.")
        router.refresh()
      } else {
        toast.error(result.message ?? "Couldn't remove the media.")
      }
    })
  }

  async function upload() {
    if (newFiles.length === 0) return
    setBusy(true)
    try {
      const fd = new FormData()
      for (const f of newFiles) fd.append("media", f)
      const res = await fetch(`/api/admin/inventory/${itemPublicId}/media`, {
        method: "POST",
        body: fd,
      })
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean
        added?: number
        message?: string
      } | null
      if (res.ok && data?.ok) {
        toast.success(`Added ${data.added} file${data.added === 1 ? "" : "s"}.`)
        setNewFiles([])
        router.refresh()
      } else {
        toast.error(data?.message ?? "Upload failed.")
      }
    } catch {
      toast.error("Could not reach the server.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {media.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((m) => (
            <li
              key={m.publicId}
              className="group relative overflow-hidden rounded-lg bg-muted"
            >
              <div className="flex aspect-video items-center justify-center">
                {m.type === "video" ? (
                  <video src={m.url} className="size-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="size-full object-cover" />
                )}
              </div>
              {m.type === "video" ? (
                <span className="absolute top-1 left-1 rounded bg-background/80 p-1">
                  <FilmIcon className="size-3" />
                </span>
              ) : null}
              <ResponsiveConfirm
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    disabled={busy}
                    aria-label="Remove media"
                    className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2Icon />
                  </Button>
                }
                title="Remove this media?"
                description="This permanently deletes the file from the item."
                confirmLabel="Remove"
                onConfirm={() => remove(m.publicId)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No media yet.</p>
      )}

      <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
        <p className="text-sm font-medium">Add media</p>
        <ItemMediaUpload media={newFiles} onChange={setNewFiles} />
        {newFiles.length > 0 ? (
          <Button
            type="button"
            onClick={upload}
            disabled={busy}
            className="w-fit"
          >
            {busy
              ? "Uploading…"
              : `Upload ${newFiles.length} file${newFiles.length === 1 ? "" : "s"}`}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
