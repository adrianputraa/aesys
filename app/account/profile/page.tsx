"use client"

import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth/client"
import { DefaultLayout } from "@/lib/layout/default-layout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Mail, Calendar, Shield } from "lucide-react"

interface UserProfile {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: Date
  role: string
}

export default function ProfilePage() {
  const { data: session } = authClient.useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      if (session?.user?.id) {
        try {
          const [roleResponse] = await Promise.all([fetch("/api/auth/role")])

          let role = "USER"
          if (roleResponse.ok) {
            const roleData = await roleResponse.json()
            role = roleData.role
          }

          setProfile({
            id: session.user.id,
            name: session.user.name || "",
            email: session.user.email || "",
            emailVerified: session.user.emailVerified || false,
            image: session.user.image || null,
            createdAt: session.user.createdAt || new Date(),
            role,
          })
        } catch (error) {
          console.error("Failed to fetch profile:", error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchProfile()
  }, [
    session?.user?.id,
    session?.user?.name,
    session?.user?.email,
    session?.user?.emailVerified,
    session?.user?.image,
    session?.user?.createdAt,
  ])

  if (isLoading) {
    return (
      <DefaultLayout>
        <div className="container py-10">
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DefaultLayout>
    )
  }

  if (!profile) {
    return (
      <DefaultLayout>
        <div className="container py-10">
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardContent className="flex items-center justify-center py-10">
                <p className="text-muted-foreground">Unable to load profile</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DefaultLayout>
    )
  }

  return (
    <DefaultLayout>
      <div className="container py-10">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={profile.image || undefined}
                    alt={profile.name}
                  />
                  <AvatarFallback className="text-lg">
                    {profile.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{profile.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {profile.role.toLowerCase()}
                    </Badge>
                    {profile.emailVerified && (
                      <Badge variant="outline" className="text-green-600">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Member Since</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(profile.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Account Status</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.emailVerified
                        ? "Email verified"
                        : "Email not verified"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DefaultLayout>
  )
}
