import type { Metadata } from "next"
import { ChevronRightIcon, UserPlusIcon } from "lucide-react"
import Link from "next/link"

import { LocalTime } from "@/components/local-time"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { RoleBadge } from "@/features/admin/components/role-badge"
import { UserFilters } from "@/features/admin/components/user-filters"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import {
  requirePermission,
  userHasPermission,
} from "@/features/admin/server/permissions"
import { listUsers } from "@/features/admin/server/users"

export const metadata: Metadata = { title: "Users · Admin" }

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[]
    field?: string | string[]
    role?: string | string[]
    page?: string | string[]
  }>
}) {
  // Self-gate data fetching (layout + page render in parallel).
  const acting = await requirePermission(PERMISSIONS.ADMIN_PAGE_USER, "/admin")
  const canCreate = await userHasPermission(
    Number(acting.id),
    acting.role,
    PERMISSIONS.CREATE_USER
  )

  const sp = await searchParams
  const q = single(sp.q) ?? ""
  const fieldRaw = single(sp.field)
  const field = fieldRaw === "name" || fieldRaw === "email" ? fieldRaw : "all"
  const role = single(sp.role) ?? "all"
  const page = Math.max(1, Number(single(sp.page)) || 1)

  const result = await listUsers({
    search: q || undefined,
    searchField: field === "all" ? undefined : field,
    role: role === "all" ? undefined : role,
    page,
  })
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize))

  const pageHref = (target: number) => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (field !== "all") params.set("field", field)
    if (role !== "all") params.set("role", role)
    if (target > 1) params.set("page", String(target))
    const qs = params.toString()
    return qs ? `/admin/users?${qs}` : "/admin/users"
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Users"
          description={`${result.total} ${result.total === 1 ? "user" : "users"} registered.`}
        />
        {canCreate ? (
          <Button asChild>
            <Link href="/admin/users/new">
              <UserPlusIcon />
              Add user
            </Link>
          </Button>
        ) : null}
      </div>

      <UserFilters q={q} field={field} role={role} />

      <div className="rounded-lg bg-card">
        {result.users.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No users match your search.
          </p>
        ) : (
          <ul>
            {result.users.map((u, i) => (
              <li key={u.publicId}>
                {i > 0 ? <Separator /> : null}
                <Link
                  href={`/admin/users/${u.publicId}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {u.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {u.email}
                    </span>
                  </div>
                  {u.banned ? (
                    <Badge variant="destructive">Restricted</Badge>
                  ) : null}
                  <RoleBadge role={u.role} />
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    <LocalTime value={u.createdAt} dateStyle="medium" />
                  </span>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              asChild={page > 1}
              variant="outline"
              size="sm"
              disabled={page <= 1}
            >
              {page > 1 ? <Link href={pageHref(page - 1)}>Previous</Link> : <span>Previous</span>}
            </Button>
            <Button
              asChild={page < totalPages}
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
            >
              {page < totalPages ? <Link href={pageHref(page + 1)}>Next</Link> : <span>Next</span>}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
