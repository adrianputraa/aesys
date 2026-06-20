"use client"

import { ChevronRightIcon, ReceiptTextIcon } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { LocalTime } from "@/components/local-time"
import { ListToolbar } from "@/components/list-toolbar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ORDER_STAGES, stageLabel } from "@/features/sales/lib/stages"
import type { OrderListRow } from "@/features/sales/server/orders"

function money(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const SORTS: Record<string, (a: OrderListRow, b: OrderListRow) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  total_high: (a, b) => b.grandTotal - a.grandTotal,
  total_low: (a, b) => a.grandTotal - b.grandTotal,
  buyer: (a, b) => a.buyerName.localeCompare(b.buyerName),
}

export function OrderList({ orders }: { orders: OrderListRow[] }) {
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState("newest")
  const [status, setStatus] = React.useState("all")

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders
      .filter((o) => {
        if (
          q &&
          !o.orderCode.toLowerCase().includes(q) &&
          !o.buyerName.toLowerCase().includes(q)
        )
          return false
        if (status !== "all" && o.status !== status) return false
        return true
      })
      .sort(SORTS[sort] ?? SORTS.newest)
  }, [orders, query, status, sort])

  return (
    <div className="flex flex-col gap-3">
      <ListToolbar
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by order code or buyer…"
        sort={sort}
        onSortChange={setSort}
        sortOptions={[
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
          { value: "total_high", label: "Total (high)" },
          { value: "total_low", label: "Total (low)" },
          { value: "buyer", label: "Buyer A–Z" },
        ]}
        filters={[
          {
            key: "status",
            label: "Status",
            value: status,
            onChange: setStatus,
            options: [
              { value: "all", label: "All statuses" },
              ...ORDER_STAGES.map((s) => ({ value: s.key, label: s.label })),
            ],
          },
        ]}
      />

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No orders match your filters.
        </p>
      ) : (
        <div className="rounded-lg bg-card">
          <ul>
            {filtered.map((o, i) => (
              <li key={o.publicId}>
                {i > 0 ? <Separator /> : null}
                <Link
                  href={`/admin/sales/${o.publicId}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ReceiptTextIcon className="size-5" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        {o.orderCode}
                      </span>
                      <Badge variant="secondary" className="px-1.5 py-0">
                        {stageLabel(o.status)}
                      </Badge>
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {o.buyerName} · added{" "}
                      <LocalTime value={o.createdAt} dateStyle="medium" />
                      {o.createdByName ? ` · ${o.createdByName}` : ""}
                    </span>
                  </div>
                  <span className="hidden text-sm font-medium tabular-nums sm:block">
                    {o.orderCurrencySymbol}
                    {money(o.grandTotal)} {o.orderCurrencyCode}
                  </span>
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
