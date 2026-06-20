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
import type { FormCurrency } from "@/features/inventory/components/add-item-form"
import { PriceConverter } from "@/features/inventory/components/price-converter"
import { generatePlanDescription } from "@/features/shipping/lib/describe-plan"
import {
  RateTierEditor,
  emptyTier,
  type TierRow,
} from "@/features/shipping/components/rate-tier-editor"
import type { ShippingPlanInfo } from "@/features/shipping/server/companies"
import {
  createPlanAction,
  updatePlanAction,
} from "@/features/shipping/server/plan-actions"

const optInt = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 0),
    "Use a whole number (0 or more)."
  )

const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a name.")
      .max(120, "Name is too long."),
    description: z.string().trim().max(2000, "Description is too long."),
    destination: z
      .string()
      .trim()
      .min(1, "Enter a destination.")
      .max(80, "Destination is too long."),
    estimatedDaysMin: optInt,
    estimatedDaysMax: optInt,
  })
  .superRefine((val, ctx) => {
    if (
      val.estimatedDaysMin !== "" &&
      val.estimatedDaysMax !== "" &&
      Number(val.estimatedDaysMax) < Number(val.estimatedDaysMin)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["estimatedDaysMax"],
        message: "Max can't be less than min.",
      })
    }
  })

type FormValues = z.infer<typeof schema>

const DEST_PRESETS = ["Domestic", "International", "Southeast Asia"]

function tiersFrom(plan?: ShippingPlanInfo): TierRow[] {
  if (!plan || plan.tiers.length === 0) return [emptyTier()]
  return plan.tiers.map((t) => ({
    fromQty: String(t.fromQty),
    toQty: t.toQty == null ? "" : String(t.toQty),
    price: String(t.price),
  }))
}

export function PlanForm({
  mode,
  companyPublicId,
  baseCurrency,
  currencies,
  plan,
  onDone,
}: {
  mode: "add" | "edit"
  companyPublicId: string
  baseCurrency: { code: string; symbol: string; publicId: string }
  currencies: FormCurrency[]
  plan?: ShippingPlanInfo
  onDone?: () => void
}) {
  const router = useRouter()
  const isEdit = mode === "edit"
  const [rateMetric, setRateMetric] = React.useState<"weight" | "volume">(
    plan?.rateMetric ?? "weight"
  )
  const [pricingMode, setPricingMode] = React.useState<"flat" | "per_unit">(
    plan?.pricingMode ?? "flat"
  )
  const [flags, setFlags] = React.useState({
    importTax: plan?.includeImportTax ?? false,
    exportTax: plan?.includeExportTax ?? false,
    handling: plan?.includeHandlingFee ?? false,
    insurance: plan?.includeInsurance ?? false,
  })
  const [tiers, setTiers] = React.useState<TierRow[]>(tiersFrom(plan))
  const [reason, setReason] = React.useState("")
  const [tierError, setTierError] = React.useState<string | null>(null)
  const [reasonError, setReasonError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: plan?.name ?? "",
      description: plan?.description ?? "",
      destination: plan?.destination ?? "",
      estimatedDaysMin: plan?.estimatedDaysMin?.toString() ?? "",
      estimatedDaysMax: plan?.estimatedDaysMax?.toString() ?? "",
    },
  })

  const unitLabel = rateMetric === "weight" ? "kg" : "m³"

  function handleGenerate() {
    const v = getValues()
    if (!v.name.trim()) {
      toast.error("Enter a plan name first.")
      return
    }
    setValue(
      "description",
      generatePlanDescription({
        name: v.name,
        destination: v.destination,
        rateMetric,
        estimatedDaysMin: v.estimatedDaysMin
          ? Number(v.estimatedDaysMin)
          : null,
        estimatedDaysMax: v.estimatedDaysMax
          ? Number(v.estimatedDaysMax)
          : null,
        includeImportTax: flags.importTax,
        includeExportTax: flags.exportTax,
        includeHandlingFee: flags.handling,
        includeInsurance: flags.insurance,
      }),
      { shouldValidate: true }
    )
  }

  async function onSubmit(values: FormValues) {
    setTierError(null)
    setReasonError(null)
    if (isEdit && !reason.trim()) {
      setReasonError("Please state a reason.")
      return
    }
    setSubmitting(true)
    const payload = {
      ...values,
      rateMetric,
      pricingMode,
      includeImportTax: flags.importTax,
      includeExportTax: flags.exportTax,
      includeHandlingFee: flags.handling,
      includeInsurance: flags.insurance,
      tiers: tiers.map((t) => ({
        fromQty: t.fromQty,
        toQty: t.toQty,
        price: t.price,
      })),
    }
    const result =
      isEdit && plan
        ? await updatePlanAction(companyPublicId, plan.publicId, {
            ...payload,
            reason,
          })
        : await createPlanAction(companyPublicId, payload)
    setSubmitting(false)

    if (result.status === "success") {
      toast.success(isEdit ? "Plan updated." : "Plan added.")
      if (!isEdit) {
        reset()
        setTiers([emptyTier()])
        setFlags({
          importTax: false,
          exportTax: false,
          handling: false,
          insurance: false,
        })
      }
      router.refresh()
      onDone?.()
      return
    }
    if (result.fieldErrors) {
      for (const [key, message] of Object.entries(result.fieldErrors)) {
        if (!message) continue
        if (key === "tiers") setTierError(message)
        else if (key === "reason") setReasonError(message)
        else if (key in values) setError(key as keyof FormValues, { message })
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel>Plan name</FieldLabel>
            <Input
              autoComplete="off"
              placeholder="e.g. Economy Sea Freight"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
            <FieldError errors={errors.name ? [errors.name] : undefined} />
          </Field>

          <Field data-invalid={Boolean(errors.destination)}>
            <FieldLabel>Destination</FieldLabel>
            <Input
              autoComplete="off"
              placeholder="Domestic, International…"
              aria-invalid={Boolean(errors.destination)}
              {...register("destination")}
            />
            <div className="flex flex-wrap gap-1">
              {DEST_PRESETS.map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() =>
                    setValue("destination", d, { shouldValidate: true })
                  }
                >
                  {d}
                </Button>
              ))}
            </div>
            <FieldError
              errors={errors.destination ? [errors.destination] : undefined}
            />
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.description)}>
          <div className="flex items-center justify-between">
            <FieldLabel>Description</FieldLabel>
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
            rows={2}
            placeholder="Describe the plan, or click Generate."
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
          <FieldError
            errors={errors.description ? [errors.description] : undefined}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.estimatedDaysMin)}>
            <FieldLabel>Est. transit min (days)</FieldLabel>
            <Input
              type="number"
              min="0"
              step="1"
              placeholder="optional"
              aria-invalid={Boolean(errors.estimatedDaysMin)}
              {...register("estimatedDaysMin")}
            />
            <FieldError
              errors={
                errors.estimatedDaysMin ? [errors.estimatedDaysMin] : undefined
              }
            />
          </Field>
          <Field data-invalid={Boolean(errors.estimatedDaysMax)}>
            <FieldLabel>Est. transit max (days)</FieldLabel>
            <Input
              type="number"
              min="0"
              step="1"
              placeholder="optional"
              aria-invalid={Boolean(errors.estimatedDaysMax)}
              {...register("estimatedDaysMax")}
            />
            <FieldError
              errors={
                errors.estimatedDaysMax ? [errors.estimatedDaysMax] : undefined
              }
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Rate based on</FieldLabel>
            <Select
              value={rateMetric}
              onValueChange={(v) => setRateMetric(v as "weight" | "volume")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight">Weight (kg)</SelectItem>
                <SelectItem value="volume">Volume (m³)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Pricing</FieldLabel>
            <Select
              value={pricingMode}
              onValueChange={(v) => setPricingMode(v as "flat" | "per_unit")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat per bracket</SelectItem>
                <SelectItem value="per_unit">Per {unitLabel}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field data-invalid={Boolean(tierError)}>
          <FieldLabel>Rate tiers ({baseCurrency.code})</FieldLabel>
          <RateTierEditor
            tiers={tiers}
            onChange={setTiers}
            unitLabel={unitLabel}
            currencySymbol={baseCurrency.symbol}
            perUnit={pricingMode === "per_unit"}
            invalid={Boolean(tierError)}
          />
          {tierError ? (
            <FieldError errors={[{ message: tierError }]} />
          ) : (
            <FieldDescription>
              Quantities in {unitLabel}; leave “To” empty for an open-ended top
              tier.
            </FieldDescription>
          )}
        </Field>

        <PriceConverter
          currencies={currencies}
          baseCurrencyPublicId={baseCurrency.publicId}
          onApply={(value) => {
            navigator.clipboard
              ?.writeText(String(value))
              .then(() => toast.success(`Copied ${value} ${baseCurrency.code}`))
              .catch(() => {})
          }}
        />
      </FieldGroup>

      <Field>
        <FieldLabel>Included in the quoted price</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["importTax", "Import tax"],
              ["exportTax", "Export tax"],
              ["handling", "Handling fees"],
              ["insurance", "Insurance"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={flags[key]}
                onCheckedChange={(c) =>
                  setFlags((f) => ({ ...f, [key]: c === true }))
                }
              />
              {label}
            </label>
          ))}
        </div>
      </Field>

      {isEdit ? (
        <Field data-invalid={Boolean(reasonError)}>
          <FieldLabel>Reason for change</FieldLabel>
          <Textarea
            rows={2}
            value={reason}
            placeholder="Why is this plan being changed?"
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={Boolean(reasonError)}
          />
          <FieldDescription>
            Required — recorded in the plan&apos;s change history.
          </FieldDescription>
          {reasonError ? (
            <FieldError errors={[{ message: reasonError }]} />
          ) : null}
        </Field>
      ) : null}

      <div className="flex justify-end gap-2">
        {isEdit ? (
          <Button
            type="button"
            variant="outline"
            onClick={onDone}
            disabled={submitting}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Add plan"}
        </Button>
      </div>
    </form>
  )
}
