import type { Metadata } from "next"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { CreateUserForm } from "@/features/admin/components/create-user-form"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { requirePermission } from "@/features/admin/server/permissions"

export const metadata: Metadata = { title: "Add user · Admin" }

export default async function NewUserPage() {
  await requirePermission(PERMISSIONS.CREATE_USER, "/admin/users")

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <Link
        href="/admin/users"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Users
      </Link>

      <PageHeader
        title="Add user"
        description="Create a new account. The user can sign in immediately with the password you set."
      />

      <Card>
        <CardContent>
          <CreateUserForm />
        </CardContent>
      </Card>
    </div>
  )
}
