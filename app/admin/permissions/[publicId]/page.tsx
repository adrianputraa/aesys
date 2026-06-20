import type { Metadata } from "next"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { LocalTime } from "@/components/local-time"
import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { GrantPermissionForm } from "@/features/admin/components/grant-permission-form"
import { PermissionGrantList } from "@/features/admin/components/permission-grant-list"
import { RoleUsersDialog } from "@/features/admin/components/role-users-dialog"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import {
  getPermissionDetailByPublicId,
  listUsersByRole,
  requirePermission,
  userHasPermission,
} from "@/features/admin/server/permissions"

export const metadata: Metadata = { title: "Permission · Admin" }

export default async function PermissionDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>
}) {
  const acting = await requirePermission(
    PERMISSIONS.ADMIN_PAGE_PERMISSION,
    "/admin"
  )

  const { publicId } = await params
  const perm = await getPermissionDetailByPublicId(publicId)
  if (!perm) notFound()

  const roleUsers = await listUsersByRole(perm.baseRole)
  const canManage = await userHasPermission(
    Number(acting.id),
    acting.role,
    PERMISSIONS.MANAGE_PERMISSION
  )

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/permissions"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Permissions
      </Link>

      <div>
        <PageHeader title={perm.name} description={perm.description} />
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {perm.value}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inherited by role</CardTitle>
          <CardDescription>
            Users at this role or higher hold this permission automatically,
            unless explicitly denied below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoleUsersDialog role={perm.baseRole} users={roleUsers} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allowed users</CardTitle>
          <CardDescription>
            Explicitly granted, even without the base role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionGrantList
            permissionPublicId={perm.publicId}
            users={perm.allowed}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Denied users</CardTitle>
          <CardDescription>
            Explicitly denied, even if they would otherwise inherit it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PermissionGrantList
            permissionPublicId={perm.publicId}
            users={perm.denied}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Add a user</CardTitle>
            <CardDescription>
              Allow or deny this permission for a specific user — effective
              immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GrantPermissionForm permissionPublicId={perm.publicId} />
          </CardContent>
        </Card>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Updated{" "}
        <LocalTime value={perm.updatedAt} dateStyle="medium" timeStyle="short" />
        {perm.lastUpdatedBy
          ? ` by ${perm.lastUpdatedBy.name} (${perm.lastUpdatedBy.email})`
          : ""}{" "}
        · Created{" "}
        <LocalTime value={perm.createdAt} dateStyle="medium" timeStyle="short" />
      </p>
    </div>
  )
}
