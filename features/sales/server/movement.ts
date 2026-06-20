import "server-only"

import { desc, eq, sql } from "drizzle-orm"

import { convert } from "@/features/admin/lib/fx"
import { currency } from "@/features/admin/schema"
import { order, orderItem } from "@/features/sales/schema"
import { db } from "@/lib/db/app"

export type SalesMovement = {
  baseCode: string
  baseSymbol: string
  totalOrders: number
  unitsSold: number
  revenueInBase: number
  topItems: { name: string; units: number }[]
  recentOrders: {
    publicId: string
    orderCode: string
    buyerName: string
    status: string
    grandTotal: number
    currencySymbol: string
    currencyCode: string
    createdAt: string
  }[]
}

/**
 * Sales-driven inventory movement for the inventory dashboard. Units sold come
 * from order line items (outbound movement); revenue sums each order's grand
 * total converted to the system base currency.
 */
export async function getSalesMovement(): Promise<SalesMovement> {
  const [baseCcy] = await db
    .select({
      code: currency.code,
      symbol: currency.symbol,
      rate: currency.rate,
    })
    .from(currency)
    .where(eq(currency.isBase, true))
    .limit(1)
  const baseRate = baseCcy?.rate ?? 1

  const orderRows = await db
    .select({
      grandTotal: order.grandTotal,
      rate: currency.rate,
    })
    .from(order)
    .innerJoin(currency, eq(order.orderCurrencyId, currency.id))

  const revenueInBase = orderRows.reduce(
    (sum, o) => sum + convert(o.grandTotal, o.rate, baseRate),
    0
  )

  const [{ units }] = await db
    .select({ units: sql<number>`coalesce(sum(${orderItem.quantity}), 0)` })
    .from(orderItem)

  const topItems = await db
    .select({
      name: orderItem.nameSnapshot,
      units: sql<number>`sum(${orderItem.quantity})`,
    })
    .from(orderItem)
    .groupBy(orderItem.nameSnapshot)
    .orderBy(desc(sql`sum(${orderItem.quantity})`))
    .limit(5)

  const recent = await db
    .select({
      publicId: order.publicId,
      orderCode: order.orderCode,
      buyerName: order.buyerName,
      status: order.status,
      grandTotal: order.grandTotal,
      currencySymbol: currency.symbol,
      currencyCode: currency.code,
      createdAt: order.createdAt,
    })
    .from(order)
    .innerJoin(currency, eq(order.orderCurrencyId, currency.id))
    .orderBy(desc(order.createdAt))
    .limit(5)

  return {
    baseCode: baseCcy?.code ?? "",
    baseSymbol: baseCcy?.symbol ?? "",
    totalOrders: orderRows.length,
    unitsSold: Number(units),
    revenueInBase,
    topItems: topItems.map((t) => ({ name: t.name, units: Number(t.units) })),
    recentOrders: recent.map((r) => ({
      publicId: r.publicId,
      orderCode: r.orderCode,
      buyerName: r.buyerName,
      status: r.status,
      grandTotal: r.grandTotal,
      currencySymbol: r.currencySymbol,
      currencyCode: r.currencyCode,
      createdAt: r.createdAt.toISOString(),
    })),
  }
}
