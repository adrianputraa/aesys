import type { Metadata } from "next"
import {
  ChevronRightIcon,
  PlusIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from "lucide-react"
import Link from "next/link"

import { LocalTime } from "@/components/local-time"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DecimalsProvider,
  DecimalsToggle,
  RateValue,
} from "@/features/admin/components/currency-decimals"
import { CurrencySparkline } from "@/features/admin/components/currency-sparkline"
import { RefreshRatesButton } from "@/features/admin/components/refresh-rates-button"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import { listCurrencies } from "@/features/admin/server/currency"
import {
  requirePermission,
  userHasPermission,
} from "@/features/admin/server/permissions"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Currency · Admin" }

export default async function CurrencyPage() {
  const acting = await requirePermission(
    PERMISSIONS.ADMIN_PAGE_CURRENCY,
    "/admin"
  )
  const canManage = await userHasPermission(
    Number(acting.id),
    acting.role,
    PERMISSIONS.MANAGE_CURRENCY
  )
  const currencies = await listCurrencies()
  const base = currencies.find((c) => c.isBase)

  return (
    <DecimalsProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title="Currency"
            description={
              base
                ? `Exchange rates are shown per 1 ${base.code} (the base currency).`
                : "Foreign-exchange rates used for item pricing."
            }
          />
          <div className="flex items-center gap-2">
            <DecimalsToggle />
            {canManage ? (
              <>
                <RefreshRatesButton />
                <Button asChild>
                  <Link href="/admin/currency/new">
                    <PlusIcon />
                    Add currency
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg bg-card">
          <ul>
            {currencies.map((c, i) => {
              const up = c.changePercent >= 0
              return (
                <li key={c.publicId}>
                  {i > 0 ? <Separator /> : null}
                  <Link
                    href={`/admin/currency/${c.publicId}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                      {c.symbol}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{c.code}</span>
                        {c.isBase ? (
                          <Badge variant="secondary">Base</Badge>
                        ) : null}
                        {c.type === "custom" ? (
                          <Badge variant="outline">Custom</Badge>
                        ) : null}
                      </div>
                      <span className="truncate text-xs text-muted-foreground">
                        {c.name}
                      </span>
                    </div>

                    <div className="hidden flex-col items-end sm:flex">
                      <RateValue
                        value={c.rate}
                        className="text-sm font-medium"
                      />
                      <span className="text-xs text-muted-foreground">
                        updated{" "}
                        <LocalTime
                          value={c.updatedAt}
                          dateStyle="medium"
                          timeStyle="short"
                        />
                      </span>
                    </div>

                    <CurrencySparkline data={c.sparkline} up={up} />

                    <div
                      className={cn(
                        "flex w-16 items-center justify-end gap-1 text-sm font-medium tabular-nums",
                        c.isBase
                          ? "text-muted-foreground"
                          : up
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                      )}
                    >
                      {c.isBase ? (
                        "—"
                      ) : (
                        <>
                          {up ? (
                            <TrendingUpIcon className="size-4" />
                          ) : (
                            <TrendingDownIcon className="size-4" />
                          )}
                          {Math.abs(c.changePercent).toFixed(2)}%
                        </>
                      )}
                    </div>

                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </DecimalsProvider>
  )
}
