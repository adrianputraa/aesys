import type { Metadata } from "next"
import {
  ArrowLeftIcon,
  TriangleAlertIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { LocalTime } from "@/components/local-time"
import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CurrencyEditForm } from "@/features/admin/components/currency-edit-form"
import { CurrencyRateChart } from "@/features/admin/components/currency-rate-chart"
import { RefreshRatesButton } from "@/features/admin/components/refresh-rates-button"
import { RemoveCurrencyButton } from "@/features/admin/components/remove-currency-button"
import { SetBaseCurrencyButton } from "@/features/admin/components/set-base-currency-button"
import { formatRate } from "@/features/admin/lib/fx"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import {
  getBaseCurrency,
  getCurrencyByPublicId,
} from "@/features/admin/server/currency"
import {
  requirePermission,
  userHasPermission,
} from "@/features/admin/server/permissions"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Currency · Admin" }

function Stat({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tabular-nums">{children}</span>
      </CardContent>
    </Card>
  )
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

export default async function CurrencyDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>
}) {
  const acting = await requirePermission(
    PERMISSIONS.ADMIN_PAGE_CURRENCY,
    "/admin"
  )

  const { publicId } = await params
  const c = await getCurrencyByPublicId(publicId)
  if (!c) notFound()

  const [canManage, base] = await Promise.all([
    userHasPermission(
      Number(acting.id),
      acting.role,
      PERMISSIONS.MANAGE_CURRENCY
    ),
    getBaseCurrency(),
  ])
  const up = c.changePercent >= 0

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/currency"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Currency
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-medium text-muted-foreground">
            {c.symbol}
          </div>
          <div className="flex flex-col gap-1">
            <PageHeader title={c.code} description={c.name} />
            <div className="flex flex-wrap gap-1.5">
              {c.isBase ? (
                <Badge variant="secondary" className="w-fit">
                  Base currency
                </Badge>
              ) : null}
              {c.type === "custom" ? (
                <Badge variant="outline" className="w-fit">
                  Custom
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        {canManage ? (
          <div className="flex items-center gap-2">
            {!c.isBase ? (
              <SetBaseCurrencyButton publicId={c.publicId} code={c.code} />
            ) : null}
            {c.type === "standard" ? <RefreshRatesButton /> : null}
          </div>
        ) : null}
      </div>

      {c.type === "custom" ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Custom currency — manual rates only</AlertTitle>
          <AlertDescription>
            This currency is excluded from automatic exchange-rate updates. Keep
            its rate current by editing it below.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label={base ? `Current rate (per 1 ${base.code})` : "Current rate"}
        >
          {formatRate(c.rate)}
        </Stat>
        <Stat label="Rate 24h ago">{formatRate(c.rate24hAgo)}</Stat>
        <Stat label="24h change">
          {c.isBase ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span
              className={cn(
                "flex items-center gap-1",
                up
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-destructive"
              )}
            >
              {up ? (
                <TrendingUpIcon className="size-5" />
              ) : (
                <TrendingDownIcon className="size-5" />
              )}
              {Math.abs(c.changePercent).toFixed(2)}%
            </span>
          )}
        </Stat>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rate history</CardTitle>
          <CardDescription>
            Recorded on every manual or automatic rate update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CurrencyRateChart history={c.history} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-border/60">
            <DetailRow label="Code">{c.code}</DetailRow>
            <DetailRow label="Name">{c.name}</DetailRow>
            <DetailRow label="Symbol">{c.symbol}</DetailRow>
            <DetailRow label="Type">
              {c.type === "custom"
                ? "Custom (manual rates)"
                : "Standard (ISO 4217)"}
            </DetailRow>
            <DetailRow label="Last updated">
              <LocalTime
                value={c.updatedAt}
                dateStyle="long"
                timeStyle="short"
              />
              {c.lastUpdatedBy ? ` · by ${c.lastUpdatedBy}` : ""}
            </DetailRow>
            <DetailRow label="Created">
              <LocalTime
                value={c.createdAt}
                dateStyle="long"
                timeStyle="short"
              />
            </DetailRow>
          </dl>
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit currency</CardTitle>
            <CardDescription>
              Update details and set the rate manually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CurrencyEditForm
              publicId={c.publicId}
              defaultName={c.name}
              defaultSymbol={c.symbol}
              defaultRate={c.rate}
              isBase={c.isBase}
            />
          </CardContent>
        </Card>
      ) : null}

      {canManage && !c.isBase ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Remove currency</p>
              <p className="text-xs text-muted-foreground">
                Deletes {c.code} and its entire rate history.
              </p>
            </div>
            <RemoveCurrencyButton publicId={c.publicId} code={c.code} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Change log</CardTitle>
          <CardDescription>Most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          {c.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No changes recorded.
            </p>
          ) : (
            <ul className="flex flex-col">
              {[...c.history].reverse().map((h, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">
                      {formatRate(h.rate)}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {h.source}
                    </Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <LocalTime
                      value={h.recordedAt}
                      dateStyle="medium"
                      timeStyle="short"
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
