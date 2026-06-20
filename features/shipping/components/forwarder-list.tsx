"use client"

import { ChevronRightIcon, TruckIcon } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { ListToolbar } from "@/components/list-toolbar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { ShippingCompanyListItem } from "@/features/shipping/server/companies"

const SORTS: Record<
  string,
  (a: ShippingCompanyListItem, b: ShippingCompanyListItem) => number
> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  name: (a, b) => a.name.localeCompare(b.name),
  plans: (a, b) => b.planCount - a.planCount,
}

export function ForwarderList({
  companies,
}: {
  companies: ShippingCompanyListItem[]
}) {
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState("newest")
  const [ccy, setCcy] = React.useState("all")
  const [dest, setDest] = React.useState("all")

  const currencies = React.useMemo(
    () => [...new Set(companies.map((c) => c.baseCurrencyCode))].sort(),
    [companies]
  )
  const destinations = React.useMemo(
    () => [...new Set(companies.flatMap((c) => c.destinations))].sort(),
    [companies]
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return companies
      .filter((c) => {
        if (q && !c.name.toLowerCase().includes(q)) return false
        if (ccy !== "all" && c.baseCurrencyCode !== ccy) return false
        if (dest !== "all" && !c.destinations.includes(dest)) return false
        return true
      })
      .sort(SORTS[sort] ?? SORTS.newest)
  }, [companies, query, ccy, dest, sort])

  return (
    <div className="flex flex-col gap-3">
      <ListToolbar
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search forwarders…"
        sort={sort}
        onSortChange={setSort}
        sortOptions={[
          { value: "newest", label: "Newest" },
          { value: "name", label: "Name A–Z" },
          { value: "plans", label: "Most plans" },
        ]}
        filters={[
          ...(currencies.length > 1
            ? [
                {
                  key: "ccy",
                  label: "Currency",
                  value: ccy,
                  onChange: setCcy,
                  options: [
                    { value: "all", label: "All currencies" },
                    ...currencies.map((c) => ({ value: c, label: c })),
                  ],
                },
              ]
            : []),
          ...(destinations.length > 0
            ? [
                {
                  key: "dest",
                  label: "Destination",
                  value: dest,
                  onChange: setDest,
                  options: [
                    { value: "all", label: "All destinations" },
                    ...destinations.map((d) => ({ value: d, label: d })),
                  ],
                },
              ]
            : []),
        ]}
      />

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No forwarders match your filters.
        </p>
      ) : (
        <div className="rounded-lg bg-card">
          <ul>
            {filtered.map((c, i) => (
              <li key={c.publicId}>
                {i > 0 ? <Separator /> : null}
                <Link
                  href={`/admin/shipping/${c.publicId}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <TruckIcon className="size-5" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {c.name}
                    </span>
                    <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="px-1.5 py-0">
                        {c.baseCurrencyCode}
                      </Badge>
                      {c.planCount} plan{c.planCount === 1 ? "" : "s"}
                      {c.destinations.slice(0, 3).map((d) => (
                        <Badge
                          key={d}
                          variant="outline"
                          className="px-1.5 py-0"
                        >
                          {d}
                        </Badge>
                      ))}
                    </span>
                  </div>
                  <div className="hidden flex-col items-end text-xs text-muted-foreground sm:flex">
                    {c.minWeightKg != null ? (
                      <span>min {c.minWeightKg} kg</span>
                    ) : null}
                    {c.minVolumeM3 != null ? (
                      <span>min {c.minVolumeM3} m³</span>
                    ) : null}
                  </div>
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
