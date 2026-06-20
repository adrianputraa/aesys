"use client"

import { PlusIcon } from "lucide-react"
import { useState, useTransition } from "react"

import { ResponsiveDialog } from "@/components/responsive-dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createCategoryAction } from "@/features/inventory/server/category-actions"
import type { CategoryOption } from "@/features/inventory/server/categories"

export function AddCategoryDialog({
  onCreated,
}: {
  onCreated: (category: CategoryOption) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setName("")
    setDescription("")
    setError(null)
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await createCategoryAction({ name, description })
      if (result.status === "success") {
        onCreated(result.category)
        reset()
        setOpen(false)
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
      trigger={
        <Button type="button" variant="outline" size="sm">
          <PlusIcon />
          Add category
        </Button>
      }
      title="Add category"
      description="Create a new category to tag items with."
    >
      <FieldGroup>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel htmlFor="new-category-name">Name</FieldLabel>
          <Input
            id="new-category-name"
            value={name}
            autoComplete="off"
            autoFocus
            placeholder="e.g. Beverages"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                submit()
              }
            }}
            aria-invalid={Boolean(error)}
          />
          {error ? (
            <FieldError errors={[{ message: error }]} />
          ) : (
            <FieldDescription>Must be unique.</FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="new-category-description">
            Description (optional)
          </FieldLabel>
          <Textarea
            id="new-category-description"
            value={description}
            rows={2}
            placeholder="What belongs in this category?"
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </FieldGroup>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={pending || !name.trim()}
        >
          {pending ? "Adding…" : "Add category"}
        </Button>
      </div>
    </ResponsiveDialog>
  )
}
