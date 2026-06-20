"use client"

import { CameraIcon, Loader2Icon, Trash2Icon } from "lucide-react"
import { useRef, useTransition } from "react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { compressAvatar } from "@/features/auth/lib/image"
import type { ActionState } from "@/features/auth/types"

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Reusable avatar control. The upload/remove actions are injected so the same UI
 * serves both the signed-in user (profile) and an admin editing another user.
 * The client compresses for network, but the server re-compresses regardless.
 */
export function AvatarUpload({
  name,
  image,
  onUpload,
  onRemove,
}: {
  name: string
  image: string | null
  onUpload: (formData: FormData) => Promise<ActionState>
  onRemove: () => Promise<ActionState>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = "" // allow re-selecting the same file later
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.")
      return
    }

    startTransition(async () => {
      let blob: Blob
      try {
        blob = await compressAvatar(file)
      } catch {
        toast.error("Could not process that image.")
        return
      }
      const formData = new FormData()
      formData.append("avatar", blob, "profilePicture.webp")
      const result = await onUpload(formData)
      if (result.status === "success") {
        toast.success(result.message ?? "Profile photo updated.")
      } else {
        toast.error(result.message ?? "Couldn't update the photo.")
      }
    })
  }

  function remove() {
    startTransition(async () => {
      const result = await onRemove()
      if (result.status === "success") {
        toast.success(result.message ?? "Profile photo removed.")
      } else {
        toast.error(result.message ?? "Couldn't remove the photo.")
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <Avatar className="size-16">
          <AvatarImage src={image ?? undefined} alt="" />
          <AvatarFallback className="text-lg">{initials(name)}</AvatarFallback>
        </Avatar>
        {pending ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          <CameraIcon />
          {image ? "Change" : "Add photo"}
        </Button>
        {image ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            onClick={remove}
            aria-label="Remove photo"
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
