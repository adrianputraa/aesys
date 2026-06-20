import type { Metadata } from "next"
import { ArrowLeftIcon, FileTextIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { LocalTime } from "@/components/local-time"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import {
  requirePermission,
  userHasPermission,
} from "@/features/admin/server/permissions"
import { ModifyOrderDialog } from "@/features/sales/components/modify-order-dialog"
import { OrderTimeline } from "@/features/sales/components/order-timeline"
import { stageLabel } from "@/features/sales/lib/stages"
import { getOrderByPublicId } from "@/features/sales/server/orders"

export const metadata: Metadata = { title: "Order · Sales" }

function money(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 py-2 sm:flex-row sm:gap-4">
      <dt className="w-36 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  )
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>
}) {
  const acting = await requirePermission(PERMISSIONS.ADMIN_PAGE_SALES, "/admin")
  const { publicId } = await params
  const o = await getOrderByPublicId(publicId)
  if (!o) notFound()

  const canManage = await userHasPermission(
    Number(acting.id),
    acting.role,
    PERMISSIONS.MANAGE_SALES
  )
  const sym = o.orderCurrency.symbol

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/sales"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Sales
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <PageHeader title={o.orderCode} description={o.buyer.name} />
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{stageLabel(o.status)}</Badge>
            {o.isInternational ? (
              <Badge variant="outline">International</Badge>
            ) : null}
            {o.isPreOrder ? <Badge variant="outline">Pre-order</Badge> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage ? <ModifyOrderDialog orderPublicId={o.publicId} /> : null}
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/sales/${o.publicId}/invoice`}>
              <FileTextIcon />
              Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* Items + totals */}
      <Card>
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
          <CardDescription>Totals in {o.orderCurrency.code}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md bg-muted/30">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="px-3 py-1.5 text-left font-normal">Item</th>
                  <th className="px-3 py-1.5 text-right font-normal">Qty</th>
                  <th className="px-3 py-1.5 text-right font-normal">Unit</th>
                  <th className="px-3 py-1.5 text-right font-normal">Total</th>
                </tr>
              </thead>
              <tbody>
                {o.items.map((it) => (
                  <tr key={it.publicId} className="tabular-nums">
                    <td className="px-3 py-1.5">{it.name}</td>
                    <td className="px-3 py-1.5 text-right">
                      {it.quantity} {it.unit}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {sym}
                      {money(it.unitPrice)}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {sym}
                      {money(it.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-3 flex flex-col gap-1 text-sm tabular-nums">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Items subtotal</dt>
              <dd>
                {sym}
                {money(o.itemsSubtotal)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Shipping
                {o.shippingPlanName ? ` (${o.shippingPlanName})` : ""}
              </dt>
              <dd>
                {sym}
                {money(o.shippingFee)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-1 font-medium">
              <dt>Grand total</dt>
              <dd>
                {sym}
                {money(o.grandTotal)} {o.orderCurrency.code}
              </dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>{o.isPreOrder ? "Down payment" : "Paid"}</dt>
              <dd>
                {o.paidCurrency.symbol}
                {money(o.paidAmount)} {o.paidCurrency.code}
                {o.showConversion
                  ? ` ≈ ${sym}${money(o.paidInOrderCurrency)} ${o.orderCurrency.code}`
                  : ""}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Order progress.</CardDescription>
          </CardHeader>
          <CardContent>
            <OrderTimeline
              orderPublicId={o.publicId}
              status={o.status}
              isInternational={o.isInternational}
              timeline={o.timeline}
              canManage={canManage}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {/* Buyer + shipping */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border/60">
                <DetailRow label="Buyer">{o.buyer.name}</DetailRow>
                {o.buyer.email ? (
                  <DetailRow label="Email">{o.buyer.email}</DetailRow>
                ) : null}
                {o.buyer.phone ? (
                  <DetailRow label="Phone">{o.buyer.phone}</DetailRow>
                ) : null}
                {o.buyer.address ? (
                  <DetailRow label="Address">{o.buyer.address}</DetailRow>
                ) : null}
                {o.buyer.country ? (
                  <DetailRow label="Country">{o.buyer.country}</DetailRow>
                ) : null}
                {o.shippingCompanyName ? (
                  <DetailRow label="Forwarder">
                    {o.shippingCompanyName}
                  </DetailRow>
                ) : null}
                {o.destination ? (
                  <DetailRow label="Destination">{o.destination}</DetailRow>
                ) : null}
                <DetailRow label="Weight / volume">
                  {o.totalWeightKg} kg · {o.totalVolumeM3} m³
                </DetailRow>
                {o.notes ? (
                  <DetailRow label="Notes">{o.notes}</DetailRow>
                ) : null}
                <DetailRow label="Created">
                  <LocalTime
                    value={o.createdAt}
                    dateStyle="long"
                    timeStyle="short"
                  />
                  {o.createdByName ? ` · by ${o.createdByName}` : ""}
                </DetailRow>
              </dl>
            </CardContent>
          </Card>

          {/* Modification history */}
          <Card>
            <CardHeader>
              <CardTitle>Modification history</CardTitle>
              <CardDescription>
                Value changes, each with a reason.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {o.modifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No modifications recorded.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {[...o.modifications].reverse().map((m) => (
                    <li
                      key={m.publicId}
                      className="border-l-2 border-border/60 pl-3 text-sm"
                    >
                      <p>
                        <span className="font-medium">{m.field}</span>:{" "}
                        <span className="text-muted-foreground line-through">
                          {m.oldValue || "—"}
                        </span>{" "}
                        → <span>{m.newValue || "—"}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.reason}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <LocalTime
                          value={m.createdAt}
                          dateStyle="medium"
                          timeStyle="short"
                        />
                        {m.actorName ? ` · ${m.actorName}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
