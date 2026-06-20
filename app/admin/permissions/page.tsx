import type { Metadata } from "next"
import { ChevronRightIcon } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RoleBadge } from "@/features/admin/components/role-badge"
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

      <div className="rounded-lg bg-card">
        <ul>
          {permissions.map((p, i) => (
            <li key={p.publicId}>
              {i > 0 ? <Separator /> : null}
              <Link
                href={`/admin/permissions/${p.publicId}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {p.value}
                  </span>
                </div>
                <RoleBadge role={p.baseRole} />
                {p.allowCount > 0 ? (
                  <Badge variant="secondary">+{p.allowCount} allowed</Badge>
                ) : null}
                {p.denyCount > 0 ? (
                  <Badge variant="destructive">−{p.denyCount} denied</Badge>
                ) : null}
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
