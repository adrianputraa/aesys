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
import { ForwarderList } from "@/features/shipping/components/forwarder-list"
import { listShippingCompanies } from "@/features/shipping/server/companies"

export const metadata: Metadata = { title: "Shipping · Admin" }

export default async function ShippingPage() {
  const acting = await requirePermission(
    PERMISSIONS.ADMIN_PAGE_SHIPPING,
    "/admin"
  )
  const canManage = await userHasPermission(
    Number(acting.id),
    acting.role,
    PERMISSIONS.MANAGE_SHIPPING
  )
  const companies = await listShippingCompanies()
  const totalPlans = companies.reduce((s, c) => s + c.planCount, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Shipping"
          description="Third-party forwarders, their plans, rates, and delivery timelines. We don't ship ourselves."
        />
        {canManage ? (
          <Button asChild>
            <Link href="/admin/shipping/new">
              <PlusIcon />
              Add forwarder
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Forwarders</span>
            <span className="text-xl font-semibold tabular-nums">
              {companies.length}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Plans</span>
            <span className="text-xl font-semibold tabular-nums">
              {totalPlans}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forwarders</CardTitle>
          <CardDescription>
            {companies.length === 0
              ? "No forwarders registered yet."
              : `${companies.length} forwarder${companies.length === 1 ? "" : "s"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {canManage ? (
                <>
                  Get started by{" "}
                  <Link href="/admin/shipping/new" className="underline">
                    registering a forwarder
                  </Link>
                  .
                </>
              ) : (
                "Forwarders added by your team will appear here."
              )}
            </p>
          ) : (
            <ForwarderList companies={companies} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
