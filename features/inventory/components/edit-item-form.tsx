"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import * as React from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { FormCurrency } from "@/features/inventory/components/add-item-form"
import { CategoryMultiSelect } from "@/features/inventory/components/category-multiselect"
import { PriceConverter } from "@/features/inventory/components/price-converter"
import { COMMON_UNITS } from "@/features/inventory/lib/units"
import type { CategoryOption } from "@/features/inventory/server/categories"
import type { ItemDetail } from "@/features/inventory/server/items"
import { updateItemAction } from "@/features/inventory/server/item-actions"

const nonNeg = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0),
    "Use a number (0 or more)."
  )

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a name.")
      .max(120, "Name is too long."),
    description: z.string().trim().max(2000, "Description is too long."),
    unit: z
      .string()
      .trim()
      .min(1, "Enter a unit.")
      .max(32, "Unit is too long."),
    basePrice: z
      .string()
      .trim()
      .refine((v) => Number(v) > 0, "Enter a price greater than 0."),
    minimumOrder: z
      .string()
      .trim()
      .refine(
        (v) => Number.isInteger(Number(v)) && Number(v) >= 0,
        "0 or more."
      ),
    maximumOrder: z.string().trim(),
    stock: z
      .string()
      .trim()
      .refine(
        (v) => Number.isInteger(Number(v)) && Number(v) >= 0,
        "0 or more."
      ),
    weightGrams: nonNeg,
    lengthCm: nonNeg,
    widthCm: nonNeg,
    heightCm: nonNeg,
    hsCode: z.string().trim().max(32, "HS code is too long."),
    countryOfOrigin: z.string().trim().max(64, "Country is too long."),
  })
  .superRefine((val, ctx) => {
    if (val.maximumOrder !== "") {
      const max = Number(val.maximumOrder)
      const min = Number(val.minimumOrder)
      if (!Number.isInteger(max) || max < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maximumOrder"],
          message: "Use a whole number (1+), or leave empty.",
        })
      } else if (Number.isInteger(min) && min > 0 && max < min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maximumOrder"],
          message: "Maximum can't be less than minimum.",
        })
      }
    }
  })

type FormValues = z.infer<typeof schema>

const str = (n: number | null | undefined) => (n == null ? "" : String(n))

export function EditItemForm({
  item,
  currencies,
  categories,
}: {
  item: ItemDetail
  currencies: FormCurrency[]
  categories: CategoryOption[]
}) {
  const router = useRouter()
  const [baseCurrencyId, setBaseCurrencyId] = React.useState(
    item.baseCurrency.publicId
  )
  const [categoryIds, setCategoryIds] = React.useState<string[]>(
    item.categories.map((c) => c.publicId)
  )
  const [fragile, setFragile] = React.useState(item.fragile)
  const [hazardous, setHazardous] = React.useState(item.hazardous)
  const [submitting, setSubmitting] = React.useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item.name,
      description: item.description,
      unit: item.unit,
      basePrice: String(item.basePrice),
      minimumOrder: String(item.minimumOrder),
      maximumOrder: str(item.maximumOrder),
      stock: String(item.stock),
      weightGrams: str(item.weightGrams),
      lengthCm: str(item.lengthCm),
      widthCm: str(item.widthCm),
      heightCm: str(item.heightCm),
      hsCode: item.hsCode ?? "",
      countryOfOrigin: item.countryOfOrigin ?? "",
    },
  })

  const baseCurrency = currencies.find((c) => c.publicId === baseCurrencyId)

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    const result = await updateItemAction(item.publicId, {
      ...values,
      baseCurrencyId,
      fragile,
      hazardous,
      categoryIds,
    })
    setSubmitting(false)
    if (result.status === "success") {
      toast.success(result.message ?? "Item updated.")
      router.refresh()
      return
    }
    if (result.fieldErrors) {
      for (const [key, message] of Object.entries(result.fieldErrors)) {
        if (message && key in values) {
          setError(key as keyof FormValues, { message })
        } else if (message) toast.error(message)
      }
    }
    if (result.message && !result.fieldErrors) toast.error(result.message)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="edit-name">Name</FieldLabel>
          <Input
            id="edit-name"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          <FieldError errors={errors.name ? [errors.name] : undefined} />
        </Field>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="edit-description">Description</FieldLabel>
          <Textarea
            id="edit-description"
            rows={3}
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
          <FieldError
            errors={errors.description ? [errors.description] : undefined}
          />
        </Field>

        <Field data-invalid={Boolean(errors.unit)}>
          <FieldLabel htmlFor="edit-unit">Unit</FieldLabel>
          <Input
            id="edit-unit"
            autoComplete="off"
            aria-invalid={Boolean(errors.unit)}
            {...register("unit")}
          />
          <div className="flex flex-wrap gap-1">
            {COMMON_UNITS.map((u) => (
              <Button
                key={u}
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setValue("unit", u, { shouldValidate: true })}
              >
                {u}
              </Button>
            ))}
          </div>
          <FieldError errors={errors.unit ? [errors.unit] : undefined} />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="edit-baseCurrency">Base currency</FieldLabel>
            <Select value={baseCurrencyId} onValueChange={setBaseCurrencyId}>
              <SelectTrigger id="edit-baseCurrency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.publicId} value={c.publicId}>
                    {c.code} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={Boolean(errors.basePrice)}>
            <FieldLabel htmlFor="edit-basePrice">
              Price{baseCurrency ? ` (${baseCurrency.code})` : ""}
            </FieldLabel>
            <Input
              id="edit-basePrice"
              type="number"
              step="any"
              min="0"
              aria-invalid={Boolean(errors.basePrice)}
              {...register("basePrice")}
            />
            <FieldDescription>
              Changing this records price history.
            </FieldDescription>
            <FieldError
              errors={errors.basePrice ? [errors.basePrice] : undefined}
            />
          </Field>
        </div>
        <PriceConverter
          currencies={currencies}
          baseCurrencyPublicId={baseCurrencyId}
          onApply={(value) =>
            setValue("basePrice", String(value), { shouldValidate: true })
          }
        />
      </FieldGroup>

      <Field>
        <FieldLabel>Categories / tags</FieldLabel>
        <CategoryMultiSelect
          initialCategories={categories}
          value={categoryIds}
          onChange={setCategoryIds}
        />
      </Field>

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={Boolean(errors.minimumOrder)}>
            <FieldLabel htmlFor="edit-min">Minimum order</FieldLabel>
            <Input
              id="edit-min"
              type="number"
              min="0"
              step="1"
              aria-invalid={Boolean(errors.minimumOrder)}
              {...register("minimumOrder")}
            />
            <FieldError
              errors={errors.minimumOrder ? [errors.minimumOrder] : undefined}
            />
          </Field>
          <Field data-invalid={Boolean(errors.maximumOrder)}>
            <FieldLabel htmlFor="edit-max">Maximum order</FieldLabel>
            <Input
              id="edit-max"
              type="number"
              min="1"
              step="1"
              placeholder="No maximum"
              aria-invalid={Boolean(errors.maximumOrder)}
              {...register("maximumOrder")}
            />
            <FieldError
              errors={errors.maximumOrder ? [errors.maximumOrder] : undefined}
            />
          </Field>
          <Field data-invalid={Boolean(errors.stock)}>
            <FieldLabel htmlFor="edit-stock">Stock</FieldLabel>
            <Input
              id="edit-stock"
              type="number"
              min="0"
              step="1"
              aria-invalid={Boolean(errors.stock)}
              {...register("stock")}
            />
            <FieldError errors={errors.stock ? [errors.stock] : undefined} />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup>
        <p className="text-sm font-medium">Shipping details</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.weightGrams)}>
            <FieldLabel htmlFor="edit-weight">Weight (grams)</FieldLabel>
            <Input
              id="edit-weight"
              type="number"
              step="any"
              min="0"
              aria-invalid={Boolean(errors.weightGrams)}
              {...register("weightGrams")}
            />
            <FieldError
              errors={errors.weightGrams ? [errors.weightGrams] : undefined}
            />
          </Field>
          <Field>
            <FieldLabel>Dimensions L×W×H (cm)</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                aria-label="Length"
                type="number"
                step="any"
                min="0"
                placeholder="L"
                {...register("lengthCm")}
              />
              <span className="text-muted-foreground">×</span>
              <Input
                aria-label="Width"
                type="number"
                step="any"
                min="0"
                placeholder="W"
                {...register("widthCm")}
              />
              <span className="text-muted-foreground">×</span>
              <Input
                aria-label="Height"
                type="number"
                step="any"
                min="0"
                placeholder="H"
                {...register("heightCm")}
              />
            </div>
          </Field>
          <Field data-invalid={Boolean(errors.hsCode)}>
            <FieldLabel htmlFor="edit-hs">HS code</FieldLabel>
            <Input
              id="edit-hs"
              autoComplete="off"
              aria-invalid={Boolean(errors.hsCode)}
              {...register("hsCode")}
            />
            <FieldError errors={errors.hsCode ? [errors.hsCode] : undefined} />
          </Field>
          <Field data-invalid={Boolean(errors.countryOfOrigin)}>
            <FieldLabel htmlFor="edit-origin">Country of origin</FieldLabel>
            <Input
              id="edit-origin"
              autoComplete="off"
              aria-invalid={Boolean(errors.countryOfOrigin)}
              {...register("countryOfOrigin")}
            />
            <FieldError
              errors={
                errors.countryOfOrigin ? [errors.countryOfOrigin] : undefined
              }
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={fragile}
              onCheckedChange={(c) => setFragile(c === true)}
            />
            Fragile
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={hazardous}
              onCheckedChange={(c) => setHazardous(c === true)}
            />
            Hazardous material
          </label>
        </div>
      </FieldGroup>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
