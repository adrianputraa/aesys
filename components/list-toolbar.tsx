"use client"

import { SearchIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type SelectOption = { value: string; label: string }

export type FilterFacet = {
  key: string
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
}

/**
 * Reusable search + sort + filter toolbar for admin list pages. Presentational
 * only — the owning client list component holds the state and does the actual
 * filtering/sorting (so the logic stays serializable-prop-free).
 */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  sort,
  onSortChange,
  sortOptions,
  filters = [],
}: {
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  sort?: string
  onSortChange?: (value: string) => void
  sortOptions?: SelectOption[]
  filters?: FilterFacet[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-44 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-8"
          aria-label="Search"
        />
      </div>

      {filters.map((f) => (
        <Select key={f.key} value={f.value} onValueChange={f.onChange}>
          <SelectTrigger className="w-auto min-w-32" aria-label={f.label}>
            <SelectValue placeholder={f.label} />
          </SelectTrigger>
          <SelectContent>
            {f.options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {sortOptions && onSortChange ? (
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-auto min-w-36" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  )
}
