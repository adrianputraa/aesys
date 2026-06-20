"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { SparklesIcon } from "lucide-react"
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
import { CategoryMultiSelect } from "@/features/inventory/components/category-multiselect"
import { ItemMediaUpload } from "@/features/inventory/components/item-media-upload"
import { PriceConverter } from "@/features/inventory/components/price-converter"
import { generateDescription } from "@/features/inventory/lib/describe"
import { COMMON_UNITS } from "@/features/inventory/lib/units"
import type { CategoryOption } from "@/features/inventory/server/categories"

export type FormCurrency = {
  publicId: string
  code: string
  symbol: string
  rate: number
  isBase: boolean
}

/** Optional non-negative number field (empty allowed). */
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
      .refine((v) => {
        const n = Number(v)
        return Number.isInteger(n) && n >= 0
      }, "Use a whole number (0 or more)."),
    maximumOrder: z.string().trim(),
    stock: z
      .string()
      .trim()
      .refine((v) => {
        const n = Number(v)
        return Number.isInteger(n) && n >= 0
      }, "Use a whole number (0 or more)."),
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
          message: "Use a whole number (1 or more), or leave empty.",
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

export function AddItemForm({
  currencies,
  categories,
}: {
  currencies: FormCurrency[]
  categories: CategoryOption[]
}) {
  const router = useRouter()
  const defaultCurrency =
    currencies.find((c) => c.code === "USD") ?? currencies[0]

  const [baseCurrencyId, setBaseCurrencyId] = React.useState(
    defaultCurrency?.publicId ?? ""
  )
  const [categoryIds, setCategoryIds] = React.useState<string[]>([])
  const [media, setMedia] = React.useState<File[]>([])
  const [fragile, setFragile] = React.useState(false)
  const [hazardous, setHazardous] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      unit: "",
      basePrice: "",
      minimumOrder: "1",
      maximumOrder: "",
      stock: "0",
      weightGrams: "",
      lengthCm: "",
      widthCm: "",
      heightCm: "",
      hsCode: "",
      countryOfOrigin: "",
    },
  })

  const baseCurrency = currencies.find((c) => c.publicId === baseCurrencyId)

  function handleGenerate() {
    const { name, unit, basePrice } = getValues()
    if (!name.trim()) {
      toast.error("Enter a name first to generate a description.")
      return
    }
    const selectedNames = categoryIds
      .map((id) => categories.find((c) => c.publicId === id)?.name)
      .filter((n): n is string => Boolean(n))
    setValue(
      "description",
      generateDescription({
        name,
        unit,
        categories: selectedNames,
        price: Number(basePrice) || undefined,
        currencyCode: baseCurrency?.code,
        currencySymbol: baseCurrency?.symbol,
      }),
      { shouldValidate: true }
    )
  }

  async function onSubmit(values: FormValues) {
    if (!baseCurrencyId) {
      toast.error("Choose a base currency.")
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.set("name", values.name)
      fd.set("description", values.description)
      fd.set("unit", values.unit)
      fd.set("baseCurrencyId", baseCurrencyId)
      fd.set("basePrice", values.basePrice)
      fd.set("minimumOrder", values.minimumOrder)
      fd.set("maximumOrder", values.maximumOrder)
      fd.set("stock", values.stock)
      fd.set("weightGrams", values.weightGrams)
      fd.set("lengthCm", values.lengthCm)
      fd.set("widthCm", values.widthCm)
      fd.set("heightCm", values.heightCm)
      fd.set("hsCode", values.hsCode)
      fd.set("countryOfOrigin", values.countryOfOrigin)
      fd.set("fragile", fragile ? "true" : "false")
      fd.set("hazardous", hazardous ? "true" : "false")
      fd.set("categoryIds", JSON.stringify(categoryIds))
      for (const file of media) fd.append("media", file)

      const res = await fetch("/api/admin/inventory", {
        method: "POST",
        body: fd,
      })
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean
        publicId?: string
        message?: string
        fieldErrors?: Record<string, string>
      } | null

      if (res.ok && data?.ok && data.publicId) {
        toast.success("Item added.")
        router.push(`/admin/inventory/${data.publicId}`)
        return
      }

      if (data?.fieldErrors) {
        for (const [key, message] of Object.entries(data.fieldErrors)) {
          if (key in values) {
            setError(key as keyof FormValues, { message })
          } else {
            toast.error(message)
          }
        }
      }
      if (data?.message) toast.error(data.message)
      else if (!data?.fieldErrors) toast.error("Could not add the item.")
    } catch {
      toast.error("Could not reach the server. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            autoComplete="off"
            placeholder="e.g. Arabica Coffee Beans"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          <FieldError errors={errors.name ? [errors.name] : undefined} />
        </Field>

        <Field data-invalid={Boolean(errors.description)}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
            >
              <SparklesIcon />
              Generate
            </Button>
          </div>
          <Textarea
            id="description"
            rows={3}
            placeholder="Describe the item, or click Generate."
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
          <FieldDescription>
            Auto-generated from the item&apos;s details (no AI) — edit freely.
          </FieldDescription>
          <FieldError
            errors={errors.description ? [errors.description] : undefined}
          />
        </Field>

        <Field data-invalid={Boolean(errors.unit)}>
          <FieldLabel htmlFor="unit">Unit</FieldLabel>
          <Input
            id="unit"
            autoComplete="off"
            placeholder="piece, kg, box…"
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
            <FieldLabel htmlFor="baseCurrency">Base currency</FieldLabel>
            <Select value={baseCurrencyId} onValueChange={setBaseCurrencyId}>
              <SelectTrigger id="baseCurrency" className="w-full">
                <SelectValue placeholder="Select a currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.publicId} value={c.publicId}>
                    {c.code} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              The currency this item is priced in.
            </FieldDescription>
          </Field>

          <Field data-invalid={Boolean(errors.basePrice)}>
            <FieldLabel htmlFor="basePrice">
              Price{baseCurrency ? ` (${baseCurrency.code})` : ""}
            </FieldLabel>
            <Input
              id="basePrice"
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={Boolean(errors.basePrice)}
              {...register("basePrice")}
            />
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
        <FieldDescription>
          Select existing categories, or add a new one.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel>Media</FieldLabel>
        <ItemMediaUpload media={media} onChange={setMedia} />
      </Field>

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={Boolean(errors.minimumOrder)}>
            <FieldLabel htmlFor="minimumOrder">Minimum order</FieldLabel>
            <Input
              id="minimumOrder"
              type="number"
              min="0"
              step="1"
              aria-invalid={Boolean(errors.minimumOrder)}
              {...register("minimumOrder")}
            />
            <FieldDescription>0 makes the item unsellable.</FieldDescription>
            <FieldError
              errors={errors.minimumOrder ? [errors.minimumOrder] : undefined}
            />
          </Field>

          <Field data-invalid={Boolean(errors.maximumOrder)}>
            <FieldLabel htmlFor="maximumOrder">Maximum order</FieldLabel>
            <Input
              id="maximumOrder"
              type="number"
              min="1"
              step="1"
              placeholder="No maximum"
              aria-invalid={Boolean(errors.maximumOrder)}
              {...register("maximumOrder")}
            />
            <FieldDescription>Leave empty for no cap.</FieldDescription>
            <FieldError
              errors={errors.maximumOrder ? [errors.maximumOrder] : undefined}
            />
          </Field>

          <Field data-invalid={Boolean(errors.stock)}>
            <FieldLabel htmlFor="stock">Stock</FieldLabel>
            <Input
              id="stock"
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
        <p className="text-sm font-medium">Shipping details (optional)</p>
        <p className="-mt-2 text-xs text-muted-foreground">
          Used by the shipping module to evaluate forwarder rates (domestic &
          international).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.weightGrams)}>
            <FieldLabel htmlFor="weightGrams">Weight (grams)</FieldLabel>
            <Input
              id="weightGrams"
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 500"
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
                aria-label="Length (cm)"
                type="number"
                step="any"
                min="0"
                placeholder="L"
                aria-invalid={Boolean(errors.lengthCm)}
                {...register("lengthCm")}
              />
              <span className="text-muted-foreground">×</span>
              <Input
                aria-label="Width (cm)"
                type="number"
                step="any"
                min="0"
                placeholder="W"
                aria-invalid={Boolean(errors.widthCm)}
                {...register("widthCm")}
              />
              <span className="text-muted-foreground">×</span>
              <Input
                aria-label="Height (cm)"
                type="number"
                step="any"
                min="0"
                placeholder="H"
                aria-invalid={Boolean(errors.heightCm)}
                {...register("heightCm")}
              />
            </div>
            <FieldDescription>Volume is derived from these.</FieldDescription>
          </Field>

          <Field data-invalid={Boolean(errors.hsCode)}>
            <FieldLabel htmlFor="hsCode">HS code</FieldLabel>
            <Input
              id="hsCode"
              autoComplete="off"
              placeholder="e.g. 0901.21"
              aria-invalid={Boolean(errors.hsCode)}
              {...register("hsCode")}
            />
            <FieldDescription>
              Customs tariff code (international).
            </FieldDescription>
            <FieldError errors={errors.hsCode ? [errors.hsCode] : undefined} />
          </Field>

          <Field data-invalid={Boolean(errors.countryOfOrigin)}>
            <FieldLabel htmlFor="countryOfOrigin">Country of origin</FieldLabel>
            <Input
              id="countryOfOrigin"
              autoComplete="off"
              placeholder="e.g. Indonesia"
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

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/inventory")}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add item"}
        </Button>
      </div>
    </form>
  )
}
