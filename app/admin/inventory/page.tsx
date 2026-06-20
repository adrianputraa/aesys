import type { Metadata } from "next"
import {
  AlertTriangleIcon,
  BoxesIcon,
  ChevronRightIcon,
  LayersIcon,
  PackageIcon,
  PlusIcon,
  ReceiptTextIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PERMISSIONS } from "@/features/admin/lib/permissions-catalog"
import {
  requirePermission,
  userHasPermission,
} from "@/features/admin/server/permissions"
import { ItemList } from "@/features/inventory/components/item-list"
import { getInventoryDashboard } from "@/features/inventory/server/items"
import { getSalesMovement } from "@/features/sales/server/movement"
import { stageLabel } from "@/features/sales/lib/stages"

export const metadata: Metadata = { title: "Inventory · Admin" }

function fmt(n: number, max = 2): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: max })
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof BoxesIcon
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="truncate text-xl font-semibold tabular-nums">
            {value}
          </span>
          {hint ? (
            <span className="text-xs text-muted-foreground">{hint}</span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function InventoryPage() {
  const acting = await requirePermission(
    PERMISSIONS.ADMIN_PAGE_INVENTORY,
    "/admin"
  )
  const [canManage, d, movement] = await Promise.all([
    userHasPermission(
      Number(acting.id),
      acting.role,
      PERMISSIONS.MANAGE_INVENTORY
    ),
    getInventoryDashboard(),
    getSalesMovement(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Inventory"
          description="Items, stock, pricing, and value across your catalog."
        />
        {canManage ? (
          <Button asChild>
            <Link href="/admin/inventory/new">
              <PlusIcon />
              Add item
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={PackageIcon} label="Items" value={fmt(d.totalItems, 0)} />
        <Stat
          icon={BoxesIcon}
          label="Stock units"
          value={fmt(d.totalStockUnits, 0)}
        />
        <Stat
          icon={WalletIcon}
          label="Inventory value"
          value={`${d.baseSymbol}${fmt(d.totalValueInBase, 0)}`}
          hint={d.baseCode ? `in ${d.baseCode}` : undefined}
        />
        <Stat
          icon={LayersIcon}
          label="Categories"
          value={fmt(d.categoriesCount, 0)}
          hint={`${d.outOfStock} out of stock · ${d.lowStock} low`}
        />
      </div>

      {d.outOfStock > 0 || d.lowStock > 0 ? (
        <Alert>
          <AlertTriangleIcon />
          <AlertTitle>Stock attention</AlertTitle>
          <AlertDescription>
            {d.outOfStock} item{d.outOfStock === 1 ? "" : "s"} out of stock and{" "}
            {d.lowStock} running low (≤ 5 units).
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Sales & movement */}
      <Card>
        <CardHeader>
          <CardTitle>Sales &amp; movement</CardTitle>
          <CardDescription>Outbound movement driven by orders.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              icon={ReceiptTextIcon}
              label="Orders"
              value={fmt(movement.totalOrders, 0)}
            />
            <Stat
              icon={BoxesIcon}
              label="Units sold"
              value={fmt(movement.unitsSold, 0)}
            />
            <Stat
              icon={TrendingUpIcon}
              label="Revenue"
              value={`${movement.baseSymbol}${fmt(movement.revenueInBase, 0)}`}
              hint={movement.baseCode ? `in ${movement.baseCode}` : undefined}
            />
          </div>

          {movement.totalOrders === 0 ? (
            <p className="text-sm text-muted-foreground">
              No orders yet — sales movement appears here once orders are
              created in the{" "}
              <Link href="/admin/sales" className="underline">
                Sales module
              </Link>
              .
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Top sellers</p>
                <ul className="flex flex-col gap-1.5">
                  {movement.topItems.map((t) => (
                    <li
                      key={t.name}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">{t.name}</span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {fmt(t.units, 0)} sold
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Recent orders</p>
                <ul className="flex flex-col">
                  {movement.recentOrders.map((o, i) => (
                    <li key={o.publicId}>
                      {i > 0 ? <Separator /> : null}
                      <Link
                        href={`/admin/sales/${o.publicId}`}
                        className="flex items-center gap-2 py-1.5 text-sm transition-colors hover:text-foreground"
                      >
                        <span className="font-mono text-xs">{o.orderCode}</span>
                        <Badge
                          variant="secondary"
                          className="px-1.5 py-0 text-[10px]"
                        >
                          {stageLabel(o.status)}
                        </Badge>
                        <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
                          {o.currencySymbol}
                          {fmt(o.grandTotal)}
                        </span>
                        <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>
            {d.totalItems === 0
              ? "No items yet."
              : `${d.totalItems} item${d.totalItems === 1 ? "" : "s"} in the catalog.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {d.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {canManage ? (
                <>
                  Get started by{" "}
                  <Link href="/admin/inventory/new" className="underline">
                    adding your first item
                  </Link>
                  .
                </>
              ) : (
                "Items added by your team will appear here."
              )}
            </p>
          ) : (
            <ItemList items={d.items} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
