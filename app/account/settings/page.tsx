"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { authClient } from "@/lib/auth/client"
import { DefaultLayout } from "@/lib/layout/default-layout"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Loader2, Trash2, Monitor, Smartphone } from "lucide-react"
import z from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
})

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(1, "New password is required"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>
type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>

interface Session {
  id: string
  createdAt: Date
  updatedAt: Date
  userId: string
  expiresAt: Date
  token: string
  ipAddress: string | null
  userAgent: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])

  const profileForm = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  })

  const passwordForm = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    async function fetchData() {
      if (session?.user) {
        try {
          const sessionsResponse = await fetch("/api/auth/sessions")
          if (sessionsResponse.ok) {
            const sessionsData = await sessionsResponse.json()
            setSessions(sessionsData.sessions || [])
          }

          profileForm.reset({
            name: session.user.name || "",
            email: session.user.email || "",
          })
        } catch (error) {
          console.error("Failed to fetch data:", error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchData()
  }, [session?.user, profileForm])

  async function onProfileSubmit(values: UpdateProfileFormValues) {
    setIsUpdatingProfile(true)

    try {
      const result = await authClient.updateUser({
        name: values.name,
      })

      if (result.error) {
        toast.error(result.error.message || "Failed to update profile")
        return
      }

      toast.success("Profile updated successfully!")
      router.refresh()
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error("Update profile error:", error)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  async function onPasswordSubmit(values: UpdatePasswordFormValues) {
    setIsUpdatingPassword(true)

    try {
      const result = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })

      if (result.error) {
        toast.error(result.error.message || "Failed to change password")
        return
      }

      toast.success("Password changed successfully!")
      passwordForm.reset()
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error("Change password error:", error)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  async function handleRevokeSession(sessionId: string) {
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      })

      if (response.ok) {
        setSessions(sessions.filter((s) => s.id !== sessionId))
        toast.success("Session revoked successfully")
      } else {
        toast.error("Failed to revoke session")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error("Revoke session error:", error)
    }
  }

  if (isLoading) {
    return (
      <DefaultLayout>
        <div className="container py-10">
          <div className="mx-auto max-w-2xl space-y-6">
            <Skeleton className="h-8 w-32" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-24" />
              </CardContent>
            </Card>
          </div>
        </div>
      </DefaultLayout>
    )
  }

  if (!session) {
    router.push("/auth/sign-in")
    return null
  }

  return (
    <DefaultLayout>
      <div className="container py-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={session.user.image || undefined}
                    alt={session.user.name || "User"}
                  />
                  <AvatarFallback>
                    {session.user.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{session.user.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.user.email}
                  </p>
                </div>
              </div>

              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your name"
                            disabled={isUpdatingProfile}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            disabled
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isUpdatingProfile}>
                    {isUpdatingProfile && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Password Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter current password"
                            disabled={isUpdatingPassword}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter new password"
                            disabled={isUpdatingPassword}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirm new password"
                            disabled={isUpdatingPassword}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isUpdatingPassword}>
                    {isUpdatingPassword && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Change Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>
                Manage your active sessions across devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active sessions found
                  </p>
                ) : (
                  sessions.map((s) => {
                    const isCurrentSession = s.id === session.session?.id
                    const userAgent = s.userAgent || "Unknown device"
                    const isMobile = /mobile/i.test(userAgent)

                    return (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          {isMobile ? (
                            <Smartphone className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <Monitor className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {isCurrentSession ? (
                                <span className="flex items-center gap-2">
                                  Current Session
                                  <Badge variant="secondary">Active</Badge>
                                </span>
                              ) : (
                                "Other Session"
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.ipAddress || "Unknown IP"} •{" "}
                              {new Date(s.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {!isCurrentSession && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRevokeSession(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DefaultLayout>
  )
}
