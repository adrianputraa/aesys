"use client"

import { XIcon } from "lucide-react"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { AddCategoryDialog } from "@/features/inventory/components/add-category-dialog"
import type { CategoryOption } from "@/features/inventory/server/categories"

/**
 * Tag picker: select one-or-more registered categories, or create a new one via
 * the "Add category" dialog. Controlled by `value` (selected public ids).
 */
export function CategoryMultiSelect({
  initialCategories,
  value,
  onChange,
}: {
  initialCategories: CategoryOption[]
  value: string[]
  onChange: (publicIds: string[]) => void
}) {
  const [options, setOptions] = React.useState(initialCategories)
  // Remounting the combobox clears its input/selection after each pick.
  const [pickerKey, setPickerKey] = React.useState(0)

  const byId = React.useMemo(
    () => new Map(options.map((o) => [o.publicId, o])),
    [options]
  )
  const selectedSet = new Set(value)
  const available = options.filter((o) => !selectedSet.has(o.publicId))

  function add(publicId: string) {
    if (!selectedSet.has(publicId)) onChange([...value, publicId])
    setPickerKey((k) => k + 1)
  }

  function remove(publicId: string) {
    onChange(value.filter((id) => id !== publicId))
  }

  function handleCreated(category: CategoryOption) {
    setOptions((prev) =>
      prev.some((o) => o.publicId === category.publicId)
        ? prev
        : [...prev, category].sort((a, b) => a.name.localeCompare(b.name))
    )
    if (!selectedSet.has(category.publicId))
      onChange([...value, category.publicId])
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const cat = byId.get(id)
            if (!cat) return null
            return (
              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                {cat.name}
                <button
                  type="button"
                  onClick={() => remove(id)}
                  className="rounded-sm opacity-60 hover:opacity-100"
                  aria-label={`Remove ${cat.name}`}
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Combobox
          key={pickerKey}
          items={available}
          value={null}
          onValueChange={(picked: CategoryOption | null) => {
            if (picked) add(picked.publicId)
          }}
          itemToStringLabel={(c: CategoryOption) => c?.name ?? ""}
          isItemEqualToValue={(a: CategoryOption, b: CategoryOption) =>
            a?.publicId === b?.publicId
          }
          filter={(c: CategoryOption, q: string) =>
            c.name.toLowerCase().includes(q.trim().toLowerCase())
          }
        >
          <ComboboxInput
            placeholder={
              available.length ? "Add a category…" : "No more categories"
            }
            autoComplete="off"
            disabled={available.length === 0}
            className="flex-1"
          />
          <ComboboxContent>
            <ComboboxEmpty>No category matches.</ComboboxEmpty>
            <ComboboxList>
              {(c: CategoryOption) => (
                <ComboboxItem key={c.publicId} value={c}>
                  {c.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        <AddCategoryDialog onCreated={handleCreated} />
      </div>
    </div>
  )
}
