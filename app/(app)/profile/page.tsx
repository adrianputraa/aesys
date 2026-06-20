import type { Metadata } from "next"
import { CircleCheckIcon } from "lucide-react"

import { LocalTime } from "@/components/local-time"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AvatarUpload } from "@/features/auth/components/avatar-upload"
import { ProfileForm } from "@/features/auth/components/profile-form"
import {
  removeAvatarAction,
  updateAvatarAction,
} from "@/features/auth/server/avatar"
import { requireUser } from "@/features/auth/server/session"

export const metadata: Metadata = { title: "Profile" }

export default async function ProfilePage() {
  const user = await requireUser()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" description="Your account details." />

      <Card>
        <CardContent className="flex items-start gap-4">
          <AvatarUpload
            name={user.name}
            image={user.image ?? null}
            onUpload={updateAvatarAction}
            onRemove={removeAvatarAction}
          />
          <div className="flex min-w-0 flex-col gap-1 pt-1">
            <span className="truncate text-lg font-medium">{user.name}</span>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="truncate">{user.email}</span>
              {user.emailVerified ? (
                <Badge variant="secondary" className="gap-1">
                  <CircleCheckIcon />
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline">Unverified</Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              Member since{" "}
              <LocalTime
                value={new Date(user.createdAt).toISOString()}
                dateStyle="long"
              />
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
          <CardDescription>Update your display name.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm defaultName={user.name} />
        </CardContent>
      </Card>
    </div>
  )
}
