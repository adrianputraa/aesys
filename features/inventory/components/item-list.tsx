"use client"

import { ChevronRightIcon, PackageIcon } from "lucide-react"
import Link from "next/link"
import * as React from "react"

import { LocalTime } from "@/components/local-time"
import { ListToolbar } from "@/components/list-toolbar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { ItemListRow } from "@/features/inventory/server/items"

function fmt(n: number, max = 2): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: max })
}

const SORTS: Record<string, (a: ItemListRow, b: ItemListRow) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  name: (a, b) => a.name.localeCompare(b.name),
  stock: (a, b) => b.stock - a.stock,
  value: (a, b) => b.valueInBase - a.valueInBase,
}

export function ItemList({ items }: { items: ItemListRow[] }) {
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState("newest")
  const [category, setCategory] = React.useState("all")
  const [stock, setStock] = React.useState("all")
  const [ccy, setCcy] = React.useState("all")

  const categories = React.useMemo(
    () => [...new Set(items.flatMap((i) => i.categories))].sort(),
    [items]
  )
  const currencies = React.useMemo(
    () => [...new Set(items.map((i) => i.baseCurrencyCode))].sort(),
    [items]
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return items
      .filter((i) => {
        if (q && !i.name.toLowerCase().includes(q)) return false
        if (category !== "all" && !i.categories.includes(category)) return false
        if (ccy !== "all" && i.baseCurrencyCode !== ccy) return false
        if (stock === "in" && i.stock <= 5) return false
        if (stock === "low" && !(i.stock > 0 && i.stock <= 5)) return false
        if (stock === "out" && i.stock !== 0) return false
        return true
      })
      .sort(SORTS[sort] ?? SORTS.newest)
  }, [items, query, category, ccy, stock, sort])

  return (
    <div className="flex flex-col gap-3">
      <ListToolbar
        search={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search items…"
        sort={sort}
        onSortChange={setSort}
        sortOptions={[
          { value: "newest", label: "Newest" },
          { value: "name", label: "Name A–Z" },
          { value: "stock", label: "Stock (high)" },
          { value: "value", label: "Value (high)" },
        ]}
        filters={[
          {
            key: "category",
            label: "Category",
            value: category,
            onChange: setCategory,
            options: [
              { value: "all", label: "All categories" },
              ...categories.map((c) => ({ value: c, label: c })),
            ],
          },
          {
            key: "stock",
            label: "Stock",
            value: stock,
            onChange: setStock,
            options: [
              { value: "all", label: "Any stock" },
              { value: "in", label: "In stock" },
              { value: "low", label: "Low stock" },
              { value: "out", label: "Out of stock" },
            ],
          },
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
        ]}
      />

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No items match your filters.
        </p>
      ) : (
        <div className="rounded-lg bg-card">
          <ul>
            {filtered.map((it, i) => (
              <li key={it.publicId}>
                {i > 0 ? <Separator /> : null}
                <Link
                  href={`/admin/inventory/${it.publicId}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                    {it.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.thumbnailUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <PackageIcon className="size-5" />
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {it.name}
                    </span>
                    <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      {it.categories.slice(0, 3).map((c) => (
                        <Badge
                          key={c}
                          variant="secondary"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {c}
                        </Badge>
                      ))}
                      <span>
                        added{" "}
                        <LocalTime value={it.createdAt} dateStyle="medium" />
                        {it.createdByName ? ` · ${it.createdByName}` : ""}
                      </span>
                    </span>
                  </div>

                  <div className="hidden flex-col items-end sm:flex">
                    <span className="text-sm font-medium tabular-nums">
                      {it.baseCurrencySymbol}
                      {fmt(it.basePrice)} {it.baseCurrencyCode}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      per {it.unit}
                    </span>
                  </div>

                  <div className="flex w-20 justify-end">
                    {it.stock === 0 ? (
                      <Badge variant="destructive">Out</Badge>
                    ) : it.stock <= 5 ? (
                      <Badge variant="outline">{it.stock} left</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {fmt(it.stock, 0)} {it.unit}
                      </span>
                    )}
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
