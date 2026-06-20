"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
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
import { updateCurrencyAction } from "@/features/admin/server/currency-actions"

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(64, "Name is too long."),
  symbol: z
    .string()
    .trim()
    .min(1, "Enter a symbol.")
    .max(8, "Symbol is too long."),
  rate: z
    .string()
    .trim()
    .refine((v) => Number(v) > 0, "Rate must be greater than 0."),
})

type FormValues = z.infer<typeof schema>

export function CurrencyEditForm({
  publicId,
  defaultName,
  defaultSymbol,
  defaultRate,
  isBase,
}: {
  publicId: string
  defaultName: string
  defaultSymbol: string
  defaultRate: number
  isBase: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultName,
      symbol: defaultSymbol,
      rate: String(defaultRate),
    },
  })

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await updateCurrencyAction(publicId, {
        name: values.name,
        symbol: values.symbol,
        rate: Number(values.rate),
      })
      if (result.status === "success") {
        toast.success(result.message ?? "Currency updated.")
        router.refresh()
        return
      }
      if (result.fieldErrors) {
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          if (message) setError(key as keyof FormValues, { message })
        }
      } else {
        toast.error(result.message ?? "Couldn't update the currency.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
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

        <Field data-invalid={Boolean(errors.symbol)}>
          <FieldLabel htmlFor="edit-symbol">Symbol</FieldLabel>
          <Input
            id="edit-symbol"
            autoComplete="off"
            aria-invalid={Boolean(errors.symbol)}
            {...register("symbol")}
          />
          <FieldError errors={errors.symbol ? [errors.symbol] : undefined} />
        </Field>

        <Field data-invalid={Boolean(errors.rate)}>
          <FieldLabel htmlFor="edit-rate">Rate (manual)</FieldLabel>
          <Input
            id="edit-rate"
            type="number"
            step="any"
            min="0"
            disabled={isBase}
            aria-invalid={Boolean(errors.rate)}
            {...register("rate")}
          />
          <FieldDescription>
            {isBase
              ? "The base currency's rate is fixed at 1."
              : "Units of this currency per 1 unit of the base currency. Saving records the change."}
          </FieldDescription>
          <FieldError errors={errors.rate ? [errors.rate] : undefined} />
        </Field>
      </FieldGroup>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
