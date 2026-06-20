"use client"

import { ClockIcon, HistoryIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { LocalTime } from "@/components/local-time"
import { ResponsiveConfirm } from "@/components/responsive-confirm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { FormCurrency } from "@/features/inventory/components/add-item-form"
import { PlanForm } from "@/features/shipping/components/plan-form"
import { deletePlanAction } from "@/features/shipping/server/plan-actions"
import type { ShippingPlanInfo } from "@/features/shipping/server/companies"

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

function PlanCard({
  plan,
  symbol,
  canManage,
  onEdit,
  onDelete,
  busy,
}: {
  plan: ShippingPlanInfo
  symbol: string
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
  busy: boolean
}) {
  const [showHistory, setShowHistory] = React.useState(false)
  const unit = plan.rateMetric === "weight" ? "kg" : "m³"
  const flags: string[] = []
  if (plan.includeImportTax) flags.push("Import tax")
  if (plan.includeExportTax) flags.push("Export tax")
  if (plan.includeHandlingFee) flags.push("Handling")
  if (plan.includeInsurance) flags.push("Insurance")

  const timeline =
    plan.estimatedDaysMin != null && plan.estimatedDaysMax != null
      ? plan.estimatedDaysMin === plan.estimatedDaysMax
        ? `${plan.estimatedDaysMin} days`
        : `${plan.estimatedDaysMin}–${plan.estimatedDaysMax} days`
      : plan.estimatedDaysMax != null
        ? `up to ${plan.estimatedDaysMax} days`
        : plan.estimatedDaysMin != null
          ? `from ${plan.estimatedDaysMin} days`
          : null

  return (
    <div className="rounded-lg bg-muted/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{plan.name}</span>
            <Badge variant="secondary">{plan.destination}</Badge>
            {timeline ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ClockIcon className="size-3" />
                {timeline}
              </span>
            ) : null}
          </div>
          {plan.description ? (
            <p className="max-w-prose text-sm text-muted-foreground">
              {plan.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline">
            {plan.pricingMode === "per_unit" ? `per ${unit}` : "flat"} · by{" "}
            {plan.rateMetric}
          </Badge>
          {canManage ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onEdit}
                aria-label="Edit plan"
                disabled={busy}
              >
                <PencilIcon />
              </Button>
              <ResponsiveConfirm
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete plan"
                    disabled={busy}
                  >
                    <Trash2Icon />
                  </Button>
                }
                title={`Delete "${plan.name}"?`}
                description="This permanently deletes the plan, its rate tiers, and its change history."
                confirmLabel="Delete plan"
                onConfirm={onDelete}
              />
            </>
          ) : null}
        </div>
      </div>

      {plan.tiers.length > 0 ? (
        <div className="mt-3 overflow-hidden rounded-md bg-background/60">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="px-3 py-1.5 text-left font-normal">
                  From ({unit})
                </th>
                <th className="px-3 py-1.5 text-left font-normal">
                  To ({unit})
                </th>
                <th className="px-3 py-1.5 text-right font-normal">Price</th>
              </tr>
            </thead>
            <tbody>
              {plan.tiers.map((t) => (
                <tr key={t.publicId} className="tabular-nums">
                  <td className="px-3 py-1.5">{fmt(t.fromQty)}</td>
                  <td className="px-3 py-1.5">
                    {t.toQty == null ? "∞" : fmt(t.toQty)}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {symbol}
                    {fmt(t.price)}
                    {plan.pricingMode === "per_unit" ? `/${unit}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {flags.length > 0 ? (
          <>
            <span className="text-xs text-muted-foreground">Includes:</span>
            {flags.map((f) => (
              <Badge
                key={f}
                variant="outline"
                className="px-1.5 py-0 text-[10px]"
              >
                {f}
              </Badge>
            ))}
          </>
        ) : null}
        {plan.events.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-xs"
            onClick={() => setShowHistory((v) => !v)}
          >
            <HistoryIcon />
            {showHistory ? "Hide" : "Show"} history ({plan.events.length})
          </Button>
        ) : null}
      </div>

      {showHistory && plan.events.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-2">
          {[...plan.events].reverse().map((e) => (
            <li key={e.publicId} className="text-xs">
              <p className="text-muted-foreground">
                <LocalTime
                  value={e.createdAt}
                  dateStyle="medium"
                  timeStyle="short"
                />
                {e.actorName ? ` · ${e.actorName}` : ""}
                {e.reason ? ` — ${e.reason}` : ""}
              </p>
              <ul className="ml-3 list-disc">
                {e.changes.map((c, i) => (
                  <li key={i}>
                    <span className="font-medium">{c.field}</span>:{" "}
                    <span className="text-muted-foreground line-through">
                      {c.oldValue || "—"}
                    </span>{" "}
                    → {c.newValue || "—"}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function PlanManager({
  companyPublicId,
  plans,
  baseCurrency,
  currencies,
  canManage,
}: {
  companyPublicId: string
  plans: ShippingPlanInfo[]
  baseCurrency: { code: string; symbol: string; publicId: string }
  currencies: FormCurrency[]
  canManage: boolean
}) {
  const router = useRouter()
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  function remove(planPublicId: string) {
    setBusy(true)
    deletePlanAction(companyPublicId, planPublicId).then((r) => {
      setBusy(false)
      if (r.status === "success") {
        toast.success("Plan deleted.")
        router.refresh()
      } else toast.error(r.message)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {plans.map((plan) =>
        editingId === plan.publicId ? (
          <div
            key={plan.publicId}
            className="rounded-lg border border-border p-4"
          >
            <p className="mb-3 text-sm font-medium">Edit plan</p>
            <PlanForm
              mode="edit"
              companyPublicId={companyPublicId}
              baseCurrency={baseCurrency}
              currencies={currencies}
              plan={plan}
              onDone={() => setEditingId(null)}
            />
          </div>
        ) : (
          <PlanCard
            key={plan.publicId}
            plan={plan}
            symbol={baseCurrency.symbol}
            canManage={canManage}
            busy={busy}
            onEdit={() => setEditingId(plan.publicId)}
            onDelete={() => remove(plan.publicId)}
          />
        )
      )}
    </div>
  )
}
