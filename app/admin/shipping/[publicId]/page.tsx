import type { Metadata } from "next"
import { ArrowLeftIcon, PackageIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { LocalTime } from "@/components/local-time"
import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { listCurrencyOptions } from "@/features/admin/server/currency"
import {
  requirePermission,
  userHasPermission,
} from "@/features/admin/server/permissions"
import { PlanForm } from "@/features/shipping/components/plan-form"
import { PlanManager } from "@/features/shipping/components/plan-manager"
import { getShippingCompanyByPublicId } from "@/features/shipping/server/companies"

export const metadata: Metadata = { title: "Forwarder · Shipping" }

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

export default async function ForwarderDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>
}) {
  const acting = await requirePermission(
    PERMISSIONS.ADMIN_PAGE_SHIPPING,
    "/admin"
  )

  const { publicId } = await params
  const company = await getShippingCompanyByPublicId(publicId)
  if (!company) notFound()

  const [canManage, currencies] = await Promise.all([
    userHasPermission(
      Number(acting.id),
      acting.role,
      PERMISSIONS.MANAGE_SHIPPING
    ),
    listCurrencyOptions(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/shipping"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Shipping
      </Link>

      <PageHeader
        title={company.name}
        description={`Rates priced in ${company.baseCurrency.code}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Forwarder details</CardTitle>
        </CardHeader>
        <CardContent>
          {company.description ? (
            <p className="mb-2 text-sm">{company.description}</p>
          ) : null}
          <dl className="divide-y divide-border/60">
            <DetailRow label="Base currency">
              {company.baseCurrency.code} ({company.baseCurrency.symbol})
            </DetailRow>
            {company.website ? (
              <DetailRow label="Website">
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary underline"
                >
                  {company.website}
                </a>
              </DetailRow>
            ) : null}
            <DetailRow label="Minimum weight">
              {company.minWeightKg != null ? `${company.minWeightKg} kg` : "—"}
            </DetailRow>
            <DetailRow label="Minimum volume">
              {company.minVolumeM3 != null ? `${company.minVolumeM3} m³` : "—"}
            </DetailRow>
            <DetailRow label="Added">
              <LocalTime
                value={company.createdAt}
                dateStyle="long"
                timeStyle="short"
              />
              {company.createdByName ? ` · by ${company.createdByName}` : ""}
            </DetailRow>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
          <CardDescription>
            Shipping options selected when creating an order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {company.plans.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <PackageIcon className="size-7" />
              <p className="text-sm">
                No plans yet
                {canManage ? " — add one below." : "."}
              </p>
            </div>
          ) : (
            <PlanManager
              companyPublicId={company.publicId}
              plans={company.plans}
              baseCurrency={company.baseCurrency}
              currencies={currencies}
              canManage={canManage}
            />
          )}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Add a plan</CardTitle>
            <CardDescription>
              Define a destination, timeline, tiered rates, and what the price
              includes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlanForm
              mode="add"
              companyPublicId={company.publicId}
              baseCurrency={company.baseCurrency}
              currencies={currencies}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
