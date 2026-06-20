import type { Metadata } from "next"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { listCurrencyOptions } from "@/features/admin/server/currency"
import { requirePermission } from "@/features/admin/server/permissions"
import { AddCompanyForm } from "@/features/shipping/components/add-company-form"

export const metadata: Metadata = { title: "Add forwarder · Shipping" }

export default async function NewForwarderPage() {
  await requirePermission(PERMISSIONS.MANAGE_SHIPPING, "/admin/shipping")
  const currencies = await listCurrencyOptions()

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        href="/admin/shipping"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Shipping
      </Link>

      <PageHeader
        title="Add forwarder"
        description="Register a third-party shipping company and its base currency."
      />

      <Card>
        <CardContent>
          {currencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a currency in the{" "}
              <Link href="/admin/currency" className="underline">
                Currency module
              </Link>{" "}
              first.
            </p>
          ) : (
            <AddCompanyForm currencies={currencies} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
