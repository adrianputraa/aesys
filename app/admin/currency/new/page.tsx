import type { Metadata } from "next"
import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { CurrencyAddForm } from "@/features/admin/components/currency-add-form"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { getBaseCurrency } from "@/features/admin/server/currency"
import { requirePermission } from "@/features/admin/server/permissions"

export const metadata: Metadata = { title: "Add currency · Admin" }

export default async function NewCurrencyPage() {
  await requirePermission(PERMISSIONS.MANAGE_CURRENCY, "/admin/currency")
  const base = await getBaseCurrency()

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <Link
        href="/admin/currency"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Currency
      </Link>

      <PageHeader
        title="Add currency"
        description="Register a new currency and its rate relative to the base currency."
      />

      <Card>
        <CardContent>
          <CurrencyAddForm baseCode={base?.code} />
        </CardContent>
      </Card>
    </div>
  )
}
