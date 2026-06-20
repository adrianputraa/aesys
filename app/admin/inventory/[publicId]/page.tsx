import type { Metadata } from "next"
import { ArrowLeftIcon, PackageIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { LocalTime } from "@/components/local-time"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
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
import { EditItemForm } from "@/features/inventory/components/edit-item-form"
import { ItemMediaManager } from "@/features/inventory/components/item-media-manager"
import { ItemPriceChart } from "@/features/inventory/components/item-price-chart"
import { listCategories } from "@/features/inventory/server/categories"
import {
  getItemByPublicId,
  getItemCurrentPrices,
  getItemPriceSeries,
} from "@/features/inventory/server/items"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Item · Inventory" }

function fmtMoney(n: number): string {
  if (n !== 0 && Math.abs(n) < 1) {
    return n.toLocaleString("en-US", { maximumSignificantDigits: 4 })
  }
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 })
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
      <dt className="w-40 shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  )
}

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>
}) {
  const acting = await requirePermission(
    PERMISSIONS.ADMIN_PAGE_INVENTORY,
    "/admin"
  )

  const { publicId } = await params
  const item = await getItemByPublicId(publicId)
  if (!item) notFound()

  const [currentPrices, priceSeries, canManage] = await Promise.all([
    getItemCurrentPrices(item.basePrice, item.baseCurrency.code),
    getItemPriceSeries(item.basePrice, item.baseCurrency.code),
    userHasPermission(
      Number(acting.id),
      acting.role,
      PERMISSIONS.MANAGE_INVENTORY
    ),
  ])
  const [currencies, categories] = canManage
    ? await Promise.all([listCurrencyOptions(), listCategories()])
    : [[], []]

  const images = item.media.filter((m) => m.type === "image")
  const videos = item.media.filter((m) => m.type === "video")

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/inventory"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Inventory
      </Link>

      <div className="flex flex-col gap-2">
        <PageHeader title={item.name} description={`Priced per ${item.unit}`} />
        {item.categories.length ? (
          <div className="flex flex-wrap gap-1.5">
            {item.categories.map((c) => (
              <Badge key={c.publicId} variant="secondary">
                {c.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      {/* Media */}
      {item.media.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={m.publicId}
              src={m.url}
              alt={item.name}
              className="aspect-video w-full rounded-lg bg-muted object-cover"
            />
          ))}
          {videos.map((m) => (
            <video
              key={m.publicId}
              src={m.url}
              controls
              className="aspect-video w-full rounded-lg bg-muted object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <PackageIcon className="size-8" />
        </div>
      )}

      {/* Price + stock summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Base price</span>
            <span className="text-lg font-semibold tabular-nums">
              {item.baseCurrency.symbol}
              {fmtMoney(item.basePrice)} {item.baseCurrency.code}
            </span>
            <span className="text-xs text-muted-foreground">
              per {item.unit}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Stock</span>
            <span className="text-lg font-semibold tabular-nums">
              {item.stock.toLocaleString("en-US")} {item.unit}
            </span>
            <span className="text-xs text-muted-foreground">
              {item.stock === 0
                ? "Out of stock"
                : item.stock <= 5
                  ? "Low stock"
                  : "In stock"}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Order limits</span>
            <span className="text-lg font-semibold tabular-nums">
              {item.minimumOrder === 0
                ? "Unsellable"
                : `min ${item.minimumOrder}`}
            </span>
            <span className="text-xs text-muted-foreground">
              {item.maximumOrder != null
                ? `max ${item.maximumOrder} per order`
                : "no maximum"}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Price in every currency (current) */}
      <Card>
        <CardHeader>
          <CardTitle>Price by currency</CardTitle>
          <CardDescription>
            The base price converted to every currency at current rates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {currentPrices.map((p) => (
              <div
                key={p.code}
                className={cn(
                  "flex flex-col rounded-lg p-3",
                  p.isBase ? "bg-primary/10" : "bg-muted/50"
                )}
              >
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {p.code}
                  {p.isBase ? (
                    <Badge
                      variant="secondary"
                      className="px-1 py-0 text-[10px]"
                    >
                      base
                    </Badge>
                  ) : null}
                </span>
                <span className="text-base font-medium tabular-nums">
                  {p.symbol}
                  {fmtMoney(p.value)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Historical cross-currency pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Historical pricing</CardTitle>
          <CardDescription>
            How this item&apos;s price moves in other currencies relative to its
            base ({item.baseCurrency.code}), based on exchange-rate history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ItemPriceChart
            series={priceSeries.series}
            timestamps={priceSeries.timestamps}
          />
        </CardContent>
      </Card>

      {/* Shipping attributes */}
      {item.weightGrams != null ||
      item.lengthCm != null ||
      item.widthCm != null ||
      item.heightCm != null ||
      item.hsCode ||
      item.countryOfOrigin ||
      item.fragile ||
      item.hazardous ? (
        <Card>
          <CardHeader>
            <CardTitle>Shipping</CardTitle>
            <CardDescription>
              Used to evaluate forwarder rates (domestic & international).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-border/60">
              {item.weightGrams != null ? (
                <DetailRow label="Weight">
                  {item.weightGrams >= 1000
                    ? `${(item.weightGrams / 1000).toLocaleString("en-US", { maximumFractionDigits: 3 })} kg`
                    : `${item.weightGrams.toLocaleString("en-US")} g`}
                </DetailRow>
              ) : null}
              {item.lengthCm != null &&
              item.widthCm != null &&
              item.heightCm != null ? (
                <>
                  <DetailRow label="Dimensions">
                    {item.lengthCm} × {item.widthCm} × {item.heightCm} cm
                  </DetailRow>
                  <DetailRow label="Volume">
                    {(
                      item.lengthCm *
                      item.widthCm *
                      item.heightCm
                    ).toLocaleString("en-US", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    cm³
                  </DetailRow>
                </>
              ) : null}
              {item.hsCode ? (
                <DetailRow label="HS code">{item.hsCode}</DetailRow>
              ) : null}
              {item.countryOfOrigin ? (
                <DetailRow label="Country of origin">
                  {item.countryOfOrigin}
                </DetailRow>
              ) : null}
              {item.fragile || item.hazardous ? (
                <DetailRow label="Handling">
                  <span className="flex flex-wrap gap-1.5">
                    {item.fragile ? (
                      <Badge variant="outline">Fragile</Badge>
                    ) : null}
                    {item.hazardous ? (
                      <Badge variant="destructive">Hazardous</Badge>
                    ) : null}
                  </span>
                </DetailRow>
              ) : null}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      {/* Description + details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          {item.description ? (
            <p className="mb-2 text-sm">{item.description}</p>
          ) : null}
          <dl className="divide-y divide-border/60">
            <DetailRow label="Unit">{item.unit}</DetailRow>
            <DetailRow label="Base currency">
              {item.baseCurrency.code} ({item.baseCurrency.symbol})
            </DetailRow>
            <DetailRow label="Minimum order">
              {item.minimumOrder === 0 ? "0 — not sellable" : item.minimumOrder}
            </DetailRow>
            <DetailRow label="Maximum order">
              {item.maximumOrder ?? "No maximum"}
            </DetailRow>
            <DetailRow label="Added">
              <LocalTime
                value={item.createdAt}
                dateStyle="long"
                timeStyle="short"
              />
              {item.createdByName ? ` · by ${item.createdByName}` : ""}
            </DetailRow>
            <DetailRow label="Last updated">
              <LocalTime
                value={item.updatedAt}
                dateStyle="long"
                timeStyle="short"
              />
              {item.lastUpdatedByName ? ` · by ${item.lastUpdatedByName}` : ""}
            </DetailRow>
          </dl>
        </CardContent>
      </Card>

      {canManage ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Media</CardTitle>
              <CardDescription>
                Add or remove this item&apos;s images and videos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ItemMediaManager
                itemPublicId={item.publicId}
                media={item.media}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edit item</CardTitle>
              <CardDescription>
                Update details, pricing, categories, and shipping attributes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditItemForm
                item={item}
                currencies={currencies}
                categories={categories}
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
