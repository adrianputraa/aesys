import type { Metadata } from "next"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { listCurrencyOptions } from "@/features/admin/server/currency"
import { requirePermission } from "@/features/admin/server/permissions"
import { AddItemForm } from "@/features/inventory/components/add-item-form"
import { listCategories } from "@/features/inventory/server/categories"

export const metadata: Metadata = { title: "Add item · Inventory" }

export default async function NewItemPage() {
  await requirePermission(PERMISSIONS.MANAGE_INVENTORY, "/admin/inventory")

  const [currencies, categories] = await Promise.all([
    listCurrencyOptions(),
    listCategories(),
  ])

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        href="/admin/inventory"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Inventory
      </Link>

      <PageHeader
        title="Add item"
        description="Register a new item, its pricing, categories, and media."
      />

      <Card>
        <CardContent>
          {currencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a currency in the{" "}
              <Link href="/admin/currency" className="underline">
                Currency module
              </Link>{" "}
              before creating items.
            </p>
          ) : (
            <AddItemForm currencies={currencies} categories={categories} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
