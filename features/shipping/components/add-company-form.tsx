"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import * as React from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
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
import { createCompanyAction } from "@/features/shipping/server/company-actions"

const nonNeg = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (Number.isFinite(Number(v)) && Number(v) >= 0),
    "Use a number (0 or more)."
  )

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(120, "Name is too long."),
  description: z.string().trim().max(2000, "Description is too long."),
  website: z.string().trim().max(200, "Website is too long."),
  minWeightKg: nonNeg,
  minVolumeM3: nonNeg,
})

type FormValues = z.infer<typeof schema>

export function AddCompanyForm({ currencies }: { currencies: FormCurrency[] }) {
  const router = useRouter()
  const defaultCurrency = currencies.find((c) => c.isBase) ?? currencies[0]
  const [baseCurrencyId, setBaseCurrencyId] = React.useState(
    defaultCurrency?.publicId ?? ""
  )
  const [submitting, setSubmitting] = React.useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      website: "",
      minWeightKg: "",
      minVolumeM3: "",
    },
  })

  async function onSubmit(values: FormValues) {
    if (!baseCurrencyId) {
      toast.error("Choose a base currency.")
      return
    }
    setSubmitting(true)
    const result = await createCompanyAction({
      ...values,
      baseCurrencyId,
    })
    setSubmitting(false)
    if (result.status === "success") {
      toast.success("Forwarder added.")
      router.push(`/admin/shipping/${result.publicId}`)
      return
    }
    if (result.fieldErrors) {
      for (const [key, message] of Object.entries(result.fieldErrors)) {
        if (key in values) setError(key as keyof FormValues, { message })
        else toast.error(message)
      }
    } else {
      toast.error(result.message)
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
          <FieldLabel htmlFor="name">Forwarder name</FieldLabel>
          <Input
            id="name"
            autoComplete="off"
            placeholder="e.g. Global Express Logistics"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          <FieldError errors={errors.name ? [errors.name] : undefined} />
        </Field>

        <Field data-invalid={Boolean(errors.website)}>
          <FieldLabel htmlFor="website">Website (optional)</FieldLabel>
          <Input
            id="website"
            autoComplete="off"
            placeholder="https://…"
            aria-invalid={Boolean(errors.website)}
            {...register("website")}
          />
          <FieldError errors={errors.website ? [errors.website] : undefined} />
        </Field>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="description">Description (optional)</FieldLabel>
          <Textarea
            id="description"
            rows={2}
            placeholder="Notes about this forwarder."
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
          <FieldError
            errors={errors.description ? [errors.description] : undefined}
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
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
            Plan rates for this forwarder are priced in this currency.
          </FieldDescription>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.minWeightKg)}>
            <FieldLabel htmlFor="minWeightKg">Minimum weight (kg)</FieldLabel>
            <Input
              id="minWeightKg"
              type="number"
              step="any"
              min="0"
              placeholder="No minimum"
              aria-invalid={Boolean(errors.minWeightKg)}
              {...register("minWeightKg")}
            />
            <FieldError
              errors={errors.minWeightKg ? [errors.minWeightKg] : undefined}
            />
          </Field>

          <Field data-invalid={Boolean(errors.minVolumeM3)}>
            <FieldLabel htmlFor="minVolumeM3">Minimum volume (m³)</FieldLabel>
            <Input
              id="minVolumeM3"
              type="number"
              step="any"
              min="0"
              placeholder="No minimum"
              aria-invalid={Boolean(errors.minVolumeM3)}
              {...register("minVolumeM3")}
            />
            <FieldError
              errors={errors.minVolumeM3 ? [errors.minVolumeM3] : undefined}
            />
          </Field>
        </div>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/shipping")}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add forwarder"}
        </Button>
      </div>
    </form>
  )
}
