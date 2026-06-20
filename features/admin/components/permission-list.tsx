"use client"

import { ChevronRightIcon } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { ListToolbar } from "@/components/list-toolbar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RoleBadge } from "@/features/admin/components/role-badge"
import type { PermissionListItem } from "@/features/admin/server/permissions"
import { ROLES } from "@/lib/permissions"

const SORTS: Record<
  string,
  (a: PermissionListItem, b: PermissionListItem) => number
> = {
  name: (a, b) => a.name.localeCompare(b.name),
  value: (a, b) => a.value.localeCompare(b.value),
  role: (a, b) =>
    ROLES.indexOf(b.baseRole as never) - ROLES.indexOf(a.baseRole as never),
  grants: (a, b) => b.allowCount + b.denyCount - (a.allowCount + a.denyCount),
}

export function PermissionList({ items }: { items: PermissionListItem[] }) {
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState("value")
  const [role, setRole] = React.useState("all")

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter((p) => {
        if (
          q &&
          !p.name.toLowerCase().includes(q) &&
          !p.value.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q)
        )
          return false
        if (role !== "all" && p.baseRole !== role) return false
        return true
      })
      .sort(SORTS[sort] ?? SORTS.value)
  }, [items, query, role, sort])

  const roles = React.useMemo(
    () => [...new Set(items.map((p) => p.baseRole))],
    [items]
  )

  return (
    <div className="flex flex-col gap-3">
      <ListToolbar
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search permissions…"
        sort={sort}
        onSortChange={setSort}
        sortOptions={[
          { value: "value", label: "Value A–Z" },
          { value: "name", label: "Name A–Z" },
          { value: "role", label: "Base role" },
          { value: "grants", label: "Most grants" },
        ]}
        filters={[
          {
            key: "role",
            label: "Base role",
            value: role,
            onChange: setRole,
            options: [
              { value: "all", label: "All roles" },
              ...roles.map((r) => ({ value: r, label: r })),
            ],
          },
        ]}
      />

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No permissions match your filters.
        </p>
      ) : (
        <div className="rounded-lg bg-card">
          <ul>
            {filtered.map((p, i) => (
              <li key={p.publicId}>
                {i > 0 ? <Separator /> : null}
                <Link
                  href={`/admin/permissions/${p.publicId}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {p.name}
                    </span>
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
      )}
    </div>
  )
}
