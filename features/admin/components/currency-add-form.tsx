"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { TriangleAlertIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ISO_CURRENCIES } from "@/features/admin/lib/iso-currencies"
import { addCurrencyAction } from "@/features/admin/server/currency-actions"

const OTHER_CODE = "__OTHER__"

type PickerItem = { code: string; name: string; symbol: string }

const PICKER_ITEMS: PickerItem[] = [
  ...ISO_CURRENCIES,
  { code: OTHER_CODE, name: "Other (custom currency)", symbol: "" },
]

function matchCurrency(item: PickerItem, query: string): boolean {
  // "Other" is always offered, regardless of the search query.
  if (item.code === OTHER_CODE) return true
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
  )
}

const schema = z
  .object({
    type: z.enum(["standard", "custom"]),
    code: z.string().trim(),
    name: z
      .string()
      .trim()
      .min(1, "Enter a name.")
      .max(64, "Name is too long."),
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
  .superRefine((val, ctx) => {
    const code = val.code.toUpperCase()
    if (val.type === "custom") {
      if (!/^[A-Z0-9]{2,10}$/.test(code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["code"],
          message: "Use 2–10 letters or digits.",
        })
      }
    } else if (!/^[A-Z]{3}$/.test(code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["code"],
        message: "Select a currency or choose “Other”.",
      })
    }
  })

type FormValues = z.infer<typeof schema>

export function CurrencyAddForm({ baseCode }: { baseCode?: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<PickerItem | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "standard",
      code: "",
      name: "",
      symbol: "",
      rate: "1",
    },
  })

  const isOther = selected?.code === OTHER_CODE
  const hasSelection = selected != null

  function onPick(item: PickerItem | null) {
    setSelected(item)
    clearErrors()
    if (!item) {
      setValue("type", "standard")
      setValue("code", "")
      return
    }
    if (item.code === OTHER_CODE) {
      setValue("type", "custom")
      setValue("code", "")
      setValue("name", "")
      setValue("symbol", "")
    } else {
      setValue("type", "standard")
      setValue("code", item.code)
      setValue("name", item.name)
      setValue("symbol", item.symbol)
    }
  }

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await addCurrencyAction({
        code: values.code,
        name: values.name,
        symbol: values.symbol,
        rate: Number(values.rate),
        type: values.type,
      })
      if (result.status === "success") {
        toast.success(result.message ?? "Currency added.")
        router.push("/admin/currency")
        return
      }
      if (result.fieldErrors) {
        for (const [key, message] of Object.entries(result.fieldErrors)) {
          if (message) setError(key as keyof FormValues, { message })
        }
      } else {
        toast.error(result.message ?? "Couldn't add the currency.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.code) && !hasSelection}>
          <FieldLabel htmlFor="currency-pick">Currency</FieldLabel>
          <Combobox
            items={PICKER_ITEMS}
            value={selected}
            onValueChange={onPick}
            itemToStringLabel={(item: PickerItem) =>
              !item
                ? ""
                : item.code === OTHER_CODE
                  ? "Other (custom currency)"
                  : `${item.code} · ${item.name}`
            }
            isItemEqualToValue={(a: PickerItem, b: PickerItem) =>
              a?.code === b?.code
            }
            filter={(item: PickerItem, q: string) => matchCurrency(item, q)}
          >
            <ComboboxInput
              id="currency-pick"
              placeholder="Search by code or name…"
              autoComplete="off"
              showClear
            />
            <ComboboxContent>
              <ComboboxEmpty>No currency matches.</ComboboxEmpty>
              <ComboboxList>
                {(item: PickerItem) =>
                  item.code === OTHER_CODE ? (
                    <ComboboxItem key={item.code} value={item}>
                      <span className="font-medium">Other</span>
                      <span className="text-muted-foreground">
                        — custom currency
                      </span>
                    </ComboboxItem>
                  ) : (
                    <ComboboxItem key={item.code} value={item}>
                      <span className="font-medium tabular-nums">
                        {item.code}
                      </span>
                      <span className="truncate text-muted-foreground">
                        {item.name}
                      </span>
                    </ComboboxItem>
                  )
                }
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <FieldDescription>
            Pick a currency to avoid code typos, or choose “Other” to define a
            custom one.
          </FieldDescription>
        </Field>

        {isOther ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>Custom currency — manual rates only</AlertTitle>
            <AlertDescription>
              Custom currencies are excluded from automatic exchange-rate
              updates. You’ll set its rate here and keep it up to date manually.
            </AlertDescription>
          </Alert>
        ) : null}

        {hasSelection ? (
          <>
            <Field data-invalid={Boolean(errors.code)}>
              <FieldLabel htmlFor="code">Code</FieldLabel>
              <Input
                id="code"
                placeholder={isOther ? "PTS" : undefined}
                autoComplete="off"
                readOnly={!isOther}
                aria-invalid={Boolean(errors.code)}
                className={isOther ? undefined : "text-muted-foreground"}
                {...register("code")}
              />
              <FieldDescription>
                {isOther
                  ? "A short, unique code (2–10 letters or digits)."
                  : "Set from the selected currency."}
              </FieldDescription>
              <FieldError errors={errors.code ? [errors.code] : undefined} />
            </Field>

            <Field data-invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                placeholder="US Dollar"
                autoComplete="off"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
            </Field>

            <Field data-invalid={Boolean(errors.symbol)}>
              <FieldLabel htmlFor="symbol">Symbol</FieldLabel>
              <Input
                id="symbol"
                placeholder="$"
                autoComplete="off"
                aria-invalid={Boolean(errors.symbol)}
                {...register("symbol")}
              />
              <FieldError
                errors={errors.symbol ? [errors.symbol] : undefined}
              />
            </Field>

            <Field data-invalid={Boolean(errors.rate)}>
              <FieldLabel htmlFor="rate">Rate</FieldLabel>
              <Input
                id="rate"
                type="number"
                step="any"
                min="0"
                aria-invalid={Boolean(errors.rate)}
                {...register("rate")}
              />
              <FieldDescription>
                How many units of this currency equal 1 {baseCode ?? "base"}{" "}
                (the base currency).
              </FieldDescription>
              <FieldError errors={errors.rate ? [errors.rate] : undefined} />
            </Field>
          </>
        ) : null}
      </FieldGroup>

      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/currency")}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !hasSelection}>
          {pending ? "Adding…" : "Add currency"}
        </Button>
      </div>
    </form>
  )
}
