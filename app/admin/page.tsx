import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ADMIN_MODULES } from "@/features/admin/lib/modules"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import {
  requirePermission,
  userHasPermission,
} from "@/features/admin/server/permissions"

export const metadata: Metadata = { title: "Admin" }

export default async function AdminHomePage() {
  const user = await requirePermission(PERMISSIONS.ADMIN_PAGE)

  // Only show modules the user can actually open.
  const allowed = await Promise.all(
    ADMIN_MODULES.map((module) =>
      userHasPermission(Number(user.id), user.role, module.permission)
    )
  )
  const modules = ADMIN_MODULES.filter((_, i) => allowed[i])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Admin"
        description="Administration modules for managing the application."
      />

      {modules.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You don&apos;t have access to any modules yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((module) => (
            <Link key={module.key} href={module.href} className="group">
              <Card className="h-full transition-colors group-hover:bg-muted/40">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <module.icon className="size-5" />
                    </div>
                    <CardTitle>{module.name}</CardTitle>
                  </div>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
