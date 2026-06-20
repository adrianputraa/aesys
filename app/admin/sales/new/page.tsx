import type { Metadata } from "next"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { requirePermission } from "@/features/admin/server/permissions"
import { CreateOrderForm } from "@/features/sales/components/create-order-form"
import { getOrderFormData } from "@/features/sales/server/order-form"

export const metadata: Metadata = { title: "New order · Sales" }

export default async function NewOrderPage() {
  await requirePermission(PERMISSIONS.MANAGE_SALES, "/admin/sales")
  const data = await getOrderFormData()

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        href="/admin/sales"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Sales
      </Link>

      <PageHeader
        title="New order"
        description="Select items and a shipping plan — fees are calculated automatically."
      />

      <Card>
        <CardContent>
          {data.currencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a currency first in the Currency module.
            </p>
          ) : (
            <CreateOrderForm data={data} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
