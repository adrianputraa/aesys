"use client"

import { XIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { convert } from "@/features/admin/lib/fx"
import {
  applyMinimum,
  evaluateShippingFee,
  roundMoney,
} from "@/features/sales/lib/pricing"
import { createOrderAction } from "@/features/sales/server/order-actions"
import type {
  OrderableItem,
  OrderCompany,
  OrderFormData,
} from "@/features/sales/server/order-form"

function money(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

type Line = { itemPublicId: string; quantity: string }

export function CreateOrderForm({ data }: { data: OrderFormData }) {
  const router = useRouter()
  const { currencies, items, companies } = data
  const base = currencies.find((c) => c.isBase) ?? currencies[0]

  const [buyerName, setBuyerName] = React.useState("")
  const [buyerEmail, setBuyerEmail] = React.useState("")
  const [buyerPhone, setBuyerPhone] = React.useState("")
  const [buyerAddress, setBuyerAddress] = React.useState("")
  const [buyerCountry, setBuyerCountry] = React.useState("")
  const [orderCurrencyId, setOrderCurrencyId] = React.useState(
    base?.publicId ?? ""
  )
  const [paidCurrencyId, setPaidCurrencyId] = React.useState(
    base?.publicId ?? ""
  )
  const [paidAmount, setPaidAmount] = React.useState("")
  const [isPreOrder, setIsPreOrder] = React.useState(false)
  const [dpType, setDpType] = React.useState<"nominal" | "percent">("nominal")
  const [dpPercent, setDpPercent] = React.useState("")
  const [lines, setLines] = React.useState<Line[]>([])
  const [companyId, setCompanyId] = React.useState("")
  const [planId, setPlanId] = React.useState("")
  const [isInternational, setIsInternational] = React.useState(false)
  const [notes, setNotes] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [pickerKey, setPickerKey] = React.useState(0)

  const itemByPid = React.useMemo(
    () => new Map(items.map((i) => [i.publicId, i])),
    [items]
  )
  const orderCcy = currencies.find((c) => c.publicId === orderCurrencyId)
  const orderRate = orderCcy?.rate ?? 1
  const company = companies.find((c) => c.publicId === companyId)
  const plan = company?.plans.find((p) => p.publicId === planId)

  const available = items.filter(
    (i) => !lines.some((l) => l.itemPublicId === i.publicId)
  )

  // --- live computation ----------------------------------------------------
  const computedLines = lines.map((l) => {
    const it = itemByPid.get(l.itemPublicId) as OrderableItem
    const qty = Number(l.quantity)
    const validQty = Number.isInteger(qty) && qty >= 1
    const unitPrice = roundMoney(
      convert(it.basePrice, it.currencyRate, orderRate)
    )
    const lineTotal = validQty ? roundMoney(unitPrice * qty) : 0
    return { line: l, item: it, qty, validQty, unitPrice, lineTotal }
  })
  const itemsSubtotal = roundMoney(
    computedLines.reduce((s, c) => s + c.lineTotal, 0)
  )
  const totalWeightKg = computedLines.reduce(
    (s, c) => s + (c.validQty ? c.item.weightKg * c.qty : 0),
    0
  )
  const totalVolumeM3 = computedLines.reduce(
    (s, c) => s + (c.validQty ? c.item.volumeM3 * c.qty : 0),
    0
  )

  const metricWeight = plan?.rateMetric !== "volume"
  const shippingQty =
    plan && company
      ? applyMinimum(
          metricWeight ? totalWeightKg : totalVolumeM3,
          metricWeight ? company.minWeightKg : company.minVolumeM3
        )
      : 0
  const shippingFee =
    plan && company
      ? roundMoney(
          convert(
            evaluateShippingFee(plan.tiers, plan.pricingMode, shippingQty),
            company.baseCurrencyRate,
            orderRate
          )
        )
      : 0
  const grandTotal = roundMoney(itemsSubtotal + shippingFee)

  // Effective payment. A pre-order down-payment by percentage is computed from
  // the grand total (so it's in the order currency); otherwise the buyer's
  // entered amount + currency is used.
  const usePercent = isPreOrder && dpType === "percent"
  const pctNum = Number(dpPercent)
  const computedFromPercent =
    usePercent && Number.isFinite(pctNum) && pctNum >= 0
      ? roundMoney((grandTotal * pctNum) / 100)
      : 0
  const effPaidCurrencyId = usePercent ? orderCurrencyId : paidCurrencyId
  const effPaidCcy = currencies.find((c) => c.publicId === effPaidCurrencyId)
  const paidNum = usePercent
    ? computedFromPercent
    : paidAmount === ""
      ? 0
      : Number(paidAmount)
  const paidValid = Number.isFinite(paidNum) && paidNum >= 0
  const paidConverted =
    paidValid && effPaidCcy
      ? roundMoney(convert(paidNum, effPaidCcy.rate, orderRate))
      : 0

  function addItem(itemPublicId: string) {
    const it = itemByPid.get(itemPublicId)
    setLines((prev) => [
      ...prev,
      { itemPublicId, quantity: String(Math.max(1, it?.minimumOrder ?? 1)) },
    ])
    setPickerKey((k) => k + 1)
  }
  function setQty(itemPublicId: string, quantity: string) {
    setLines((prev) =>
      prev.map((l) =>
        l.itemPublicId === itemPublicId ? { ...l, quantity } : l
      )
    )
  }
  function removeLine(itemPublicId: string) {
    setLines((prev) => prev.filter((l) => l.itemPublicId !== itemPublicId))
  }
  function onSelectCompany(id: string) {
    setCompanyId(id)
    setPlanId("")
  }
  function onSelectPlan(id: string) {
    setPlanId(id)
    const p = company?.plans.find((pp) => pp.publicId === id)
    if (p)
      setIsInternational(p.destination.toLowerCase().includes("international"))
  }

  async function submit() {
    setErrors({})
    if (!buyerName.trim()) {
      setErrors({ buyerName: "Enter the buyer's name." })
      return
    }
    if (lines.length === 0) {
      setErrors({ lineItems: "Add at least one item." })
      return
    }
    setSubmitting(true)
    const result = await createOrderAction({
      buyerName,
      buyerEmail,
      buyerPhone,
      buyerAddress,
      buyerCountry,
      orderCurrencyId,
      paidCurrencyId: effPaidCurrencyId,
      paidAmount: paidNum,
      lineItems: lines.map((l) => ({
        itemPublicId: l.itemPublicId,
        quantity: l.quantity,
      })),
      shippingPlanId: planId || undefined,
      isInternational,
      isPreOrder,
      notes,
    })
    setSubmitting(false)
    if (result.status === "success" && result.publicId) {
      toast.success("Order created.")
      router.push(`/admin/sales/${result.publicId}`)
      return
    }
    if (result.status === "error") {
      if (result.fieldErrors)
        setErrors(result.fieldErrors as Record<string, string>)
      toast.error(result.message)
    }
  }

  const orderSym = orderCcy?.symbol ?? ""

  return (
    <div className="flex flex-col gap-6">
      {/* Buyer */}
      <FieldGroup>
        <p className="text-sm font-medium">Buyer</p>
        <Field data-invalid={Boolean(errors.buyerName)}>
          <FieldLabel htmlFor="buyerName">Name</FieldLabel>
          <Input
            id="buyerName"
            value={buyerName}
            autoComplete="off"
            onChange={(e) => setBuyerName(e.target.value)}
            aria-invalid={Boolean(errors.buyerName)}
          />
          <FieldError
            errors={
              errors.buyerName ? [{ message: errors.buyerName }] : undefined
            }
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="buyerEmail">Email</FieldLabel>
            <Input
              id="buyerEmail"
              value={buyerEmail}
              autoComplete="off"
              onChange={(e) => setBuyerEmail(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="buyerPhone">Phone</FieldLabel>
            <Input
              id="buyerPhone"
              value={buyerPhone}
              autoComplete="off"
              onChange={(e) => setBuyerPhone(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="buyerCountry">Country</FieldLabel>
            <Input
              id="buyerCountry"
              value={buyerCountry}
              autoComplete="off"
              onChange={(e) => setBuyerCountry(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="buyerAddress">Address</FieldLabel>
            <Input
              id="buyerAddress"
              value={buyerAddress}
              autoComplete="off"
              onChange={(e) => setBuyerAddress(e.target.value)}
            />
          </Field>
        </div>
      </FieldGroup>

      {/* Currency */}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="orderCurrency">Order currency</FieldLabel>
          <Select value={orderCurrencyId} onValueChange={setOrderCurrencyId}>
            <SelectTrigger id="orderCurrency" className="w-full">
              <SelectValue placeholder="Select" />
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
            Line items and totals are computed in this currency.
          </FieldDescription>
        </Field>
      </FieldGroup>

      {/* Items */}
      <Field data-invalid={Boolean(errors.lineItems)}>
        <FieldLabel>Items</FieldLabel>
        <Combobox
          key={pickerKey}
          items={available}
          value={null}
          onValueChange={(picked: OrderableItem | null) => {
            if (picked) addItem(picked.publicId)
          }}
          itemToStringLabel={(i: OrderableItem) => i?.name ?? ""}
          isItemEqualToValue={(a: OrderableItem, b: OrderableItem) =>
            a?.publicId === b?.publicId
          }
          filter={(i: OrderableItem, q: string) =>
            i.name.toLowerCase().includes(q.trim().toLowerCase())
          }
        >
          <ComboboxInput
            placeholder={available.length ? "Add an item…" : "All items added"}
            autoComplete="off"
            disabled={available.length === 0}
          />
          <ComboboxContent>
            <ComboboxEmpty>No item matches.</ComboboxEmpty>
            <ComboboxList>
              {(i: OrderableItem) => (
                <ComboboxItem key={i.publicId} value={i}>
                  <span className="flex-1 truncate">{i.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {i.currencyCode} {money(i.basePrice)}
                  </span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        {computedLines.length > 0 ? (
          <div className="mt-2 flex flex-col gap-2">
            {computedLines.map(
              ({ line, item, validQty, unitPrice, lineTotal }) => (
                <div
                  key={line.itemPublicId}
                  className="flex items-center gap-2 rounded-lg bg-muted/40 p-2"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {orderSym}
                      {money(unitPrice)} / {item.unit}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    aria-label={`Quantity for ${item.name}`}
                    aria-invalid={!validQty}
                    onChange={(e) => setQty(line.itemPublicId, e.target.value)}
                    className="w-20"
                  />
                  <span className="w-24 text-right text-sm tabular-nums">
                    {orderSym}
                    {money(lineTotal)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => removeLine(line.itemPublicId)}
                  >
                    <XIcon />
                  </Button>
                </div>
              )
            )}
          </div>
        ) : (
          <FieldDescription>
            {items.length === 0
              ? "No inventory items available — add items first."
              : "Add one or more items to this order."}
          </FieldDescription>
        )}
        <FieldError
          errors={
            errors.lineItems ? [{ message: errors.lineItems }] : undefined
          }
        />
      </Field>

      {/* Shipping */}
      <FieldGroup>
        <p className="text-sm font-medium">Shipping</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="company">Forwarder</FieldLabel>
            <Select value={companyId} onValueChange={onSelectCompany}>
              <SelectTrigger id="company" className="w-full">
                <SelectValue placeholder="Select a forwarder" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c: OrderCompany) => (
                  <SelectItem key={c.publicId} value={c.publicId}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="plan">Plan</FieldLabel>
            <Select
              value={planId}
              onValueChange={onSelectPlan}
              disabled={!company}
            >
              <SelectTrigger id="plan" className="w-full">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {(company?.plans ?? []).map((p) => (
                  <SelectItem key={p.publicId} value={p.publicId}>
                    {p.name} · {p.destination}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        {plan ? (
          <p className="text-xs text-muted-foreground">
            {plan.destination} · priced by {plan.rateMetric} ·{" "}
            {totalWeightKg > 0 || totalVolumeM3 > 0
              ? `${plan.rateMetric === "weight" ? `${totalWeightKg.toFixed(2)} kg` : `${totalVolumeM3.toFixed(4)} m³`} → `
              : ""}
            shipping {orderSym}
            {money(shippingFee)}
            {plan.estimatedDaysMin != null && plan.estimatedDaysMax != null
              ? ` · ${plan.estimatedDaysMin}–${plan.estimatedDaysMax} days`
              : ""}
          </p>
        ) : null}
        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            checked={isInternational}
            onCheckedChange={(c) => setIsInternational(c === true)}
          />
          International order (adds a storage stage to the timeline)
        </label>
      </FieldGroup>

      {/* Payment + totals */}
      <FieldGroup>
        <p className="text-sm font-medium">Payment</p>

        <label className="flex w-fit items-center gap-2 text-sm">
          <Checkbox
            checked={isPreOrder}
            onCheckedChange={(c) => setIsPreOrder(c === true)}
          />
          Pre-order (buyer pays a down-payment first)
        </label>

        {isPreOrder ? (
          <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Down payment as
              </span>
              <Select
                value={dpType}
                onValueChange={(v) => setDpType(v as "nominal" | "percent")}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nominal">Exact amount</SelectItem>
                  <SelectItem value="percent">% of total</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dpType === "percent" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={dpPercent}
                  placeholder="e.g. 50"
                  onChange={(e) => setDpPercent(e.target.value)}
                  className="w-28"
                  aria-label="Down payment percent"
                />
                <span className="text-sm text-muted-foreground">
                  % of total
                </span>
                <span className="text-sm tabular-nums">
                  = {orderSym}
                  {money(computedFromPercent)} {orderCcy?.code}
                </span>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  value={paidCurrencyId}
                  onValueChange={setPaidCurrencyId}
                >
                  <SelectTrigger className="w-full">
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
                <Input
                  type="number"
                  step="any"
                  min="0"
                  value={paidAmount}
                  placeholder="Down payment"
                  onChange={(e) => setPaidAmount(e.target.value)}
                  aria-label="Down payment amount"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="paidCurrency">Paid currency</FieldLabel>
              <Select value={paidCurrencyId} onValueChange={setPaidCurrencyId}>
                <SelectTrigger id="paidCurrency" className="w-full">
                  <SelectValue placeholder="Select" />
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
            <Field data-invalid={Boolean(errors.paidAmount)}>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="paidAmount">Amount paid</FieldLabel>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    setPaidCurrencyId(orderCurrencyId)
                    setPaidAmount(String(grandTotal))
                  }}
                >
                  Same as total
                </button>
              </div>
              <Input
                id="paidAmount"
                type="number"
                step="any"
                min="0"
                value={paidAmount}
                placeholder="0.00"
                onChange={(e) => setPaidAmount(e.target.value)}
                aria-invalid={Boolean(errors.paidAmount)}
              />
              <FieldError
                errors={
                  errors.paidAmount
                    ? [{ message: errors.paidAmount }]
                    : undefined
                }
              />
            </Field>
          </div>
        )}

        <div className="rounded-lg bg-muted/40 p-3 text-sm tabular-nums">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Items subtotal</span>
            <span>
              {orderSym}
              {money(itemsSubtotal)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>
              {orderSym}
              {money(shippingFee)}
            </span>
          </div>
          <div className="mt-1 flex justify-between border-t border-border/60 pt-1 font-medium">
            <span>Grand total ({orderCcy?.code})</span>
            <span>
              {orderSym}
              {money(grandTotal)}
            </span>
          </div>
          {paidValid && effPaidCcy ? (
            <>
              <div className="mt-1 flex justify-between text-muted-foreground">
                <span>{isPreOrder ? "Down payment" : "Paid"}</span>
                <span>
                  {effPaidCcy.symbol}
                  {money(paidNum)} {effPaidCcy.code}
                  {effPaidCurrencyId !== orderCurrencyId
                    ? ` ≈ ${orderSym}${money(paidConverted)} ${orderCcy?.code}`
                    : ""}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Balance due</span>
                <span>
                  {orderSym}
                  {money(Math.max(0, roundMoney(grandTotal - paidConverted)))}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </FieldGroup>

      <Field>
        <FieldLabel htmlFor="notes">Notes (optional)</FieldLabel>
        <Textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/sales")}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={submitting}>
          {submitting ? "Creating…" : "Create order"}
        </Button>
      </div>
    </div>
  )
}
