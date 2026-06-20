"use server"

import { revalidatePath } from "next/cache"

import { clearAvatar, storeAvatar } from "@/features/auth/server/avatar-store"
import { getServerSession } from "@/features/auth/server/session"
import type { ActionState } from "@/features/auth/types"

/** Self-service avatar actions — operate on the signed-in user. */

export async function updateAvatarAction(
  formData: FormData
): Promise<ActionState> {
  const session = await getServerSession()
  if (!session) {
    return { status: "error", message: "You are not signed in." }
  }

  const result = await storeAvatar(
    session.user.publicId,
    Number(session.user.id),
    formData.get("avatar")
  )
  if (result.status === "success") {
    // "layout" so the app header avatar refreshes too.
    revalidatePath("/profile", "layout")
  }
  return result
}

export async function removeAvatarAction(): Promise<ActionState> {
  const session = await getServerSession()
  if (!session) {
    return { status: "error", message: "You are not signed in." }
  }

  const result = await clearAvatar(
    session.user.publicId,
    Number(session.user.id)
  )
  if (result.status === "success") {
    revalidatePath("/profile", "layout")
  }
  return result
}
