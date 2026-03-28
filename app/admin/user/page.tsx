"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth/client"
import { DefaultLayout } from "@/lib/layout/default-layout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { Search, Loader2 } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: Date
}

export default function AdminUserPage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    async function checkAdminAccess() {
      if (session?.user?.id) {
        try {
          const response = await fetch("/api/auth/role")
          if (response.ok) {
            const data = await response.json()
            setUserRole(data.role)

            if (data.role !== "ADMIN") {
              router.push("/")
              return
            }
          } else {
            router.push("/")
            return
          }
        } catch (error) {
          console.error("Failed to check admin access:", error)
          router.push("/")
          return
        } finally {
          setIsLoading(false)
        }
      } else if (session === null) {
        router.push("/auth/sign-in")
      }
    }

    checkAdminAccess()
  }, [session, router])

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setUsers([])
      return
    }

    setIsSearching(true)

    try {
      const response = await fetch(
        `/api/admin/users?search=${encodeURIComponent(query)}`
      )

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      } else {
        toast.error("Failed to search users")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
      console.error("Search users error:", error)
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, searchUsers])

  if (isLoading) {
    return (
      <DefaultLayout>
        <div className="container py-10">
          <div className="mx-auto max-w-4xl space-y-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="mt-4 h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </DefaultLayout>
    )
  }

  if (userRole !== "ADMIN") {
    return null
  }

  return (
    <DefaultLayout>
      <div className="container py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-muted-foreground">
              Search and manage registered users
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Search Users</CardTitle>
              <CardDescription>
                Search for users by name or email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {isSearching && (
                  <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>

              {users.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={user.image || undefined}
                                alt={user.name}
                              />
                              <AvatarFallback>
                                {user.name?.charAt(0)?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.emailVerified ? "default" : "secondary"
                            }
                          >
                            {user.emailVerified ? "Verified" : "Unverified"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : searchQuery && !isSearching ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  No users found matching your search
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </DefaultLayout>
  )
}
