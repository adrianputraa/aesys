import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { PermissionList } from "@/features/admin/components/permission-list"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import {
  listPermissions,
  requirePermission,
} from "@/features/admin/server/permissions"

export const metadata: Metadata = { title: "Permissions · Admin" }

export default async function AdminPermissionsPage() {
  await requirePermission(PERMISSIONS.ADMIN_PAGE_PERMISSION, "/admin")
  const permissions = await listPermissions()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Permissions"
        description="Each permission is inherited by its base role and can be granted to or denied from individual users."
      />

      <PermissionList items={permissions} />
    </div>
  )
}
