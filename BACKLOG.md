# Backlog

Deferred work and known follow-ups, newest first. Keep entries short and
actionable; move them into a PR/issue when picked up.

## Orders / Sales module — follow-ups

The Sales module (`features/sales`, `/admin/sales`) is **implemented**: create
order → select items → select a shipping plan → auto-evaluate fees → save;
order list + detail; algorithmic order code; templated timeline (advance / set
manually); modify-with-reason history; and a print/PDF invoice with paid-vs-order
currency conversion. Remaining follow-ups:

- **Stock**: orders don't yet decrement `item.stock` or record a stock movement
  (see below). Wire creation/cancellation into the stock ledger.
- **Taxes/handling amounts**: plan `include_*` flags are shown on the invoice but
  taxes/handling aren't computed as separate amounts (no tax-rate data exists).
  Add tax rates + line items when needed.
- **Edit line items / cancel orders**: the modify flow covers scalar order
  fields (buyer, totals, notes) with a reason; editing line items or cancelling
  an order isn't built yet.
- **Snapshots vs. live**: orders snapshot item/plan names + prices at creation
  (invoice stability). A re-quote action could refresh against current rates.

## Inventory — stock-movement ledger

The inventory dashboard's **"Sales & movement"** section is now live (units sold,
revenue, top sellers, recent orders — `getSalesMovement()`). Remaining:

- Record stock movements (in/out, reason, actor) in an append-only ledger so
  `stock` is derived/auditable rather than a bare column, and orders decrement it.
- Order creation enforces `minimum_order` / `maximum_order` (a `minimum_order` of
  0 means unsellable and is rejected). Stock availability isn't checked yet (no
  ledger).

## Inventory — item editing & media management

Items are create-only for now. Add: edit item fields/price (append to
`item_price_history` on price change — the chart already reads it), reorder /
remove media (delete the file via `deleteItemMediaDir` and the row), and item
deletion (cascade removes categories/media/price rows; also call
`deleteItemMediaDir`).

## Inventory — video transcoding (intentionally skipped)

Videos are stored as-is (≤ 50 MB), no transcoding — ffmpeg/`fluent-ffmpeg` is a
heavy native dependency and out of scope for now (the request said only if not
complicated). If revisited, transcode to a web-friendly H.264/VP9 MP4/WebM and
generate a poster thumbnail, ideally off the request path (a queue/worker).

## Base-currency change — downstream recalculation

Changing the base currency (admin → Currency → a currency → **Set as base**)
currently **only rebases the foreign-exchange rates** (every currency's rate is
divided by the new base's rate; the new base becomes `1`). It does **not** yet
touch anything priced in a currency. When the inventory / point-of-sale system
lands, switching the base must also reconcile:

- **Item pricing** — items store a buy/sell price in some currency. Decide
  whether stored prices are immutable (and only _displayed_ via `convert()`) or
  whether a base change should re-express/re-anchor them. Recompute or
  re-validate margins after a base change.
- **Shipping** — shipping costs/fees expressed in a currency need the same
  treatment as item prices.
- **Tax** — tax amounts/thresholds tied to a currency (and any rounding rules)
  must be recalculated against the new base.

Until then, the **Set as base** confirmation warns the admin that item,
shipping, and tax calculations may be affected and should be reviewed.

Implementation notes when picked up:

- `setBaseCurrencyAction` (`features/admin/server/currency-actions.ts`) is the
  single entry point — extend it (or emit an event it can hook into) so the
  recalculation runs in the same transaction.
- Prefer storing monetary amounts with an explicit currency code + amount, and
  convert at read time via `convert()` (`features/admin/lib/fx.ts`), so a base
  change is display-only and this backlog item mostly becomes validation.

## Custom ("OTHER") currencies

Custom currencies are excluded from the live exchange-rate API and rely on
manual rate updates. If a custom currency later maps to a real ISO code, add a
way to "promote" it to `standard` so it rejoins automatic updates.
