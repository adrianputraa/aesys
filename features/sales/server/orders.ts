import "server-only"

import { asc, desc, eq, inArray } from "drizzle-orm"

import { convert } from "@/features/admin/lib/fx"
import { currency } from "@/features/admin/schema"
import { isUuid } from "@/features/auth/lib/validation"
import { order, orderEvent, orderItem } from "@/features/sales/schema"
import { db } from "@/lib/db/app"
import { user as userTable } from "@/lib/db/app/auth-schema"

export type OrderListRow = {
  publicId: string
  orderCode: string
  buyerName: string
  status: string
  orderCurrencyCode: string
  orderCurrencySymbol: string
  grandTotal: number
  createdAt: string
  createdByName: string | null
}

export type OrderLineItem = {
  publicId: string
  name: string
  unit: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type OrderEventInfo = {
  publicId: string
  status: string | null
  field: string | null
  oldValue: string | null
  newValue: string | null
  reason: string | null
  actorName: string | null
  createdAt: string
}

export type Money = { code: string; symbol: string }

export type OrderDetail = {
  publicId: string
  orderCode: string
  buyer: {
    name: string
    email: string | null
    phone: string | null
    address: string | null
    country: string | null
  }
  status: string
  isInternational: boolean
  isPreOrder: boolean
  orderCurrency: Money
  paidCurrency: Money
  paidAmount: number
  /** Paid amount expressed in the order currency (for the invoice). */
  paidInOrderCurrency: number
  showConversion: boolean
  itemsSubtotal: number
  shippingFee: number
  grandTotal: number
  shippingCompanyName: string | null
  shippingPlanName: string | null
  destination: string | null
  totalWeightKg: number
  totalVolumeM3: number
  notes: string | null
  items: OrderLineItem[]
  timeline: OrderEventInfo[]
  modifications: OrderEventInfo[]
  createdAt: string
  updatedAt: string
  createdByName: string | null
  lastUpdatedByName: string | null
}

export async function listOrders(limit = 200): Promise<OrderListRow[]> {
  const rows = await db
    .select({
      publicId: order.publicId,
      orderCode: order.orderCode,
      buyerName: order.buyerName,
      status: order.status,
      grandTotal: order.grandTotal,
      createdAt: order.createdAt,
      code: currency.code,
      symbol: currency.symbol,
      createdByName: userTable.name,
    })
    .from(order)
    .innerJoin(currency, eq(order.orderCurrencyId, currency.id))
    .leftJoin(userTable, eq(order.createdBy, userTable.id))
    .orderBy(desc(order.createdAt))
    .limit(limit)

  return rows.map((r) => ({
    publicId: r.publicId,
    orderCode: r.orderCode,
    buyerName: r.buyerName,
    status: r.status,
    orderCurrencyCode: r.code,
    orderCurrencySymbol: r.symbol,
    grandTotal: r.grandTotal,
    createdAt: r.createdAt.toISOString(),
    createdByName: r.createdByName ?? null,
  }))
}

export async function getOrderByPublicId(
  publicId: string
): Promise<OrderDetail | null> {
  if (!isUuid(publicId)) return null

  const [row] = await db
    .select()
    .from(order)
    .where(eq(order.publicId, publicId))
    .limit(1)
  if (!row) return null

  const currencyRows = await db
    .select({
      id: currency.id,
      code: currency.code,
      symbol: currency.symbol,
      rate: currency.rate,
    })
    .from(currency)
    .where(inArray(currency.id, [row.orderCurrencyId, row.paidCurrencyId]))
  const ccyById = new Map(currencyRows.map((c) => [c.id, c]))
  const orderCcy = ccyById.get(row.orderCurrencyId)
  const paidCcy = ccyById.get(row.paidCurrencyId)

  const [items, events] = await Promise.all([
    db
      .select()
      .from(orderItem)
      .where(eq(orderItem.orderId, row.id))
      .orderBy(asc(orderItem.id)),
    db
      .select({
        publicId: orderEvent.publicId,
        kind: orderEvent.kind,
        status: orderEvent.status,
        field: orderEvent.field,
        oldValue: orderEvent.oldValue,
        newValue: orderEvent.newValue,
        reason: orderEvent.reason,
        createdAt: orderEvent.createdAt,
        createdBy: orderEvent.createdBy,
        actorName: userTable.name,
      })
      .from(orderEvent)
      .leftJoin(userTable, eq(orderEvent.createdBy, userTable.id))
      .where(eq(orderEvent.orderId, row.id))
      .orderBy(asc(orderEvent.createdAt), asc(orderEvent.id)),
  ])

  const userIds = [row.createdBy, row.lastUpdatedBy].filter(
    (v): v is number => v != null
  )
  const names = userIds.length
    ? await db
        .select({ id: userTable.id, name: userTable.name })
        .from(userTable)
        .where(inArray(userTable.id, userIds))
    : []
  const nameById = new Map(names.map((n) => [n.id, n.name]))

  const toEvent = (e: (typeof events)[number]): OrderEventInfo => ({
    publicId: e.publicId,
    status: e.status,
    field: e.field,
    oldValue: e.oldValue,
    newValue: e.newValue,
    reason: e.reason,
    actorName: e.actorName ?? null,
    createdAt: e.createdAt.toISOString(),
  })

  const orderRate = orderCcy?.rate ?? 1
  const paidRate = paidCcy?.rate ?? 1
  const showConversion = row.orderCurrencyId !== row.paidCurrencyId

  return {
    publicId: row.publicId,
    orderCode: row.orderCode,
    buyer: {
      name: row.buyerName,
      email: row.buyerEmail,
      phone: row.buyerPhone,
      address: row.buyerAddress,
      country: row.buyerCountry,
    },
    status: row.status,
    isInternational: row.isInternational,
    isPreOrder: row.isPreOrder,
    orderCurrency: {
      code: orderCcy?.code ?? "?",
      symbol: orderCcy?.symbol ?? "",
    },
    paidCurrency: { code: paidCcy?.code ?? "?", symbol: paidCcy?.symbol ?? "" },
    paidAmount: row.paidAmount,
    paidInOrderCurrency: convert(row.paidAmount, paidRate, orderRate),
    showConversion,
    itemsSubtotal: row.itemsSubtotal,
    shippingFee: row.shippingFee,
    grandTotal: row.grandTotal,
    shippingCompanyName: row.shippingCompanyName,
    shippingPlanName: row.shippingPlanName,
    destination: row.destination,
    totalWeightKg: row.totalWeightKg,
    totalVolumeM3: row.totalVolumeM3,
    notes: row.notes,
    items: items.map((i) => ({
      publicId: i.publicId,
      name: i.nameSnapshot,
      unit: i.unit,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
    timeline: events.filter((e) => e.kind === "status").map(toEvent),
    modifications: events.filter((e) => e.kind === "modification").map(toEvent),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdByName:
      row.createdBy != null ? (nameById.get(row.createdBy) ?? null) : null,
    lastUpdatedByName:
      row.lastUpdatedBy != null
        ? (nameById.get(row.lastUpdatedBy) ?? null)
        : null,
  }
}
