import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
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
import { OrderList } from "@/features/sales/components/order-list"
import { listOrders } from "@/features/sales/server/orders"

export const metadata: Metadata = { title: "Sales · Admin" }

export default async function SalesPage() {
  const acting = await requirePermission(PERMISSIONS.ADMIN_PAGE_SALES, "/admin")
  const canManage = await userHasPermission(
    Number(acting.id),
    acting.role,
    PERMISSIONS.MANAGE_SALES
  )
  const orders = await listOrders()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Sales"
          description="Orders, their timeline, and invoices."
        />
        {canManage ? (
          <Button asChild>
            <Link href="/admin/sales/new">
              <PlusIcon />
              New order
            </Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            {orders.length === 0
              ? "No orders yet."
              : `${orders.length} order${orders.length === 1 ? "" : "s"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {canManage ? (
                <>
                  Create your first{" "}
                  <Link href="/admin/sales/new" className="underline">
                    order
                  </Link>
                  .
                </>
              ) : (
                "Orders will appear here."
              )}
            </p>
          ) : (
            <OrderList orders={orders} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
