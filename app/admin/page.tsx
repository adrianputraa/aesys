"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth/client"
import { DefaultLayout } from "@/lib/layout/default-layout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Settings, Shield, BarChart3 } from "lucide-react"

export default function AdminPage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  if (isLoading) {
    return (
      <DefaultLayout>
        <div className="container py-10">
          <div className="mx-auto max-w-4xl space-y-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </div>
      </DefaultLayout>
    )
  }

  if (userRole !== "ADMIN") {
    return null
  }

  const adminCards = [
    {
      title: "User Management",
      description: "Search and manage registered users",
      icon: Users,
      href: "/admin/user",
    },
    {
      title: "System Settings",
      description: "Configure system-wide settings",
      icon: Settings,
      href: "#",
    },
    {
      title: "Security",
      description: "Manage security and access controls",
      icon: Shield,
      href: "#",
    },
    {
      title: "Analytics",
      description: "View system analytics and reports",
      icon: BarChart3,
      href: "#",
    },
  ]

  return (
    <DefaultLayout>
      <div className="container py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your system and users from this central dashboard
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {adminCards.map((card) => (
              <Card
                key={card.title}
                className="transition-shadow hover:shadow-lg"
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <card.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <Link href={card.href}>Access</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DefaultLayout>
  )
}
