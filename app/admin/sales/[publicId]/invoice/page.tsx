import type { Metadata } from "next"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { LocalTime } from "@/components/local-time"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { requirePermission } from "@/features/admin/server/permissions"
import { PrintButton } from "@/features/sales/components/print-button"
import { stageLabel } from "@/features/sales/lib/stages"
import { getOrderByPublicId } from "@/features/sales/server/orders"

export const metadata: Metadata = { title: "Invoice · Sales" }

function money(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ publicId: string }>
}) {
  await requirePermission(PERMISSIONS.ADMIN_PAGE_SALES, "/admin")
  const { publicId } = await params
  const o = await getOrderByPublicId(publicId)
  if (!o) notFound()

  const sym = o.orderCurrency.symbol
  const balance = o.grandTotal - o.paidInOrderCurrency
  const paidStatus =
    balance <= 0.005
      ? "PAID"
      : o.paidInOrderCurrency > 0.005
        ? o.isPreOrder
          ? "DOWNPAYMENT"
          : "PARTIAL"
        : "UNPAID"

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between gap-2 print:hidden">
        <Link
          href={`/admin/sales/${o.publicId}`}
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Order
        </Link>
        <PrintButton
          orderCode={o.orderCode}
          buyerName={o.buyer.name}
          paidStatus={paidStatus}
        />
      </div>

      {/* Printable invoice */}
      <div className="rounded-lg bg-card p-8 print:rounded-none print:p-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-semibold">Invoice</h1>
            <p className="font-mono text-sm text-muted-foreground">
              {o.orderCode}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">aesys</p>
            <p className="text-muted-foreground">
              Issued <LocalTime value={o.createdAt} dateStyle="medium" />
            </p>
            <p className="text-muted-foreground">
              Status: {stageLabel(o.status)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Billed to
            </p>
            <p className="font-medium">{o.buyer.name}</p>
            {o.buyer.email ? (
              <p className="text-muted-foreground">{o.buyer.email}</p>
            ) : null}
            {o.buyer.phone ? (
              <p className="text-muted-foreground">{o.buyer.phone}</p>
            ) : null}
            {o.buyer.address ? (
              <p className="text-muted-foreground">{o.buyer.address}</p>
            ) : null}
            {o.buyer.country ? (
              <p className="text-muted-foreground">{o.buyer.country}</p>
            ) : null}
          </div>
          {o.shippingCompanyName ? (
            <div className="text-sm sm:text-right">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Shipping
              </p>
              <p>{o.shippingCompanyName}</p>
              {o.shippingPlanName ? (
                <p className="text-muted-foreground">{o.shippingPlanName}</p>
              ) : null}
              {o.destination ? (
                <p className="text-muted-foreground">{o.destination}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-2 text-left font-normal">Description</th>
              <th className="py-2 text-right font-normal">Qty</th>
              <th className="py-2 text-right font-normal">Unit price</th>
              <th className="py-2 text-right font-normal">Amount</th>
            </tr>
          </thead>
          <tbody>
            {o.items.map((it) => (
              <tr
                key={it.publicId}
                className="border-b border-border/40 tabular-nums"
              >
                <td className="py-2">{it.name}</td>
                <td className="py-2 text-right">
                  {it.quantity} {it.unit}
                </td>
                <td className="py-2 text-right">
                  {sym}
                  {money(it.unitPrice)}
                </td>
                <td className="py-2 text-right">
                  {sym}
                  {money(it.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm tabular-nums">
          <div className="flex w-full max-w-xs justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>
              {sym}
              {money(o.itemsSubtotal)}
            </span>
          </div>
          <div className="flex w-full max-w-xs justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>
              {sym}
              {money(o.shippingFee)}
            </span>
          </div>
          <div className="flex w-full max-w-xs justify-between border-t border-border pt-1 text-base font-semibold">
            <span>Total ({o.orderCurrency.code})</span>
            <span>
              {sym}
              {money(o.grandTotal)}
            </span>
          </div>

          <div className="mt-2 flex w-full max-w-xs justify-between">
            <span className="text-muted-foreground">
              {o.isPreOrder ? "Down payment" : "Paid"} ({o.paidCurrency.code})
            </span>
            <span>
              {o.paidCurrency.symbol}
              {money(o.paidAmount)}
            </span>
          </div>
          {o.showConversion ? (
            <div className="flex w-full max-w-xs justify-between text-xs text-muted-foreground">
              <span>≈ converted to {o.orderCurrency.code}</span>
              <span>
                {sym}
                {money(o.paidInOrderCurrency)}
              </span>
            </div>
          ) : null}
          <div className="flex w-full max-w-xs justify-between border-t border-border pt-1 font-medium">
            <span>{balance > 0.005 ? "Balance due" : "Balance"}</span>
            <span>
              {sym}
              {money(Math.abs(balance) < 0.005 ? 0 : balance)}
            </span>
          </div>
        </div>

        {o.showConversion ? (
          <p className="mt-6 text-xs text-muted-foreground">
            The buyer paid in {o.paidCurrency.code}; amounts are shown converted
            to {o.orderCurrency.code} at current exchange rates (approximate).
          </p>
        ) : null}
      </div>
    </div>
  )
}
