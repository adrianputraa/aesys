# CLAUDE.md

Guidance for working in this repository. Read this before writing code.

## ⚠️ This is Next.js 16 — not the version you were trained on

Next.js 16 has breaking changes to APIs, conventions, and file structure. **Before
writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`**
(see `01-app/` for App Router). Heed deprecation notices. Do not assume APIs from
memory — verify against the bundled docs. (This mirrors `AGENTS.md`.)

Useful bundled docs:

- `node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/` — `cookies`, `headers`, `fetch`, caching, `revalidate*`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/` — `page`, `layout`, `route`, `loading`, etc.
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/` — `next.config` options

## Stack

| Concern         | Choice                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Framework       | Next.js 16 (App Router), **Turbopack** (default in dev _and_ build — no `--turbopack` flag needed)                                   |
| UI runtime      | React 19 (stable) with **React Compiler**                                                                                            |
| Components      | shadcn/ui (`radix-nova` style, `mauve` base) built on Radix UI primitives                                                            |
| Icons           | lucide-react                                                                                                                         |
| Styling         | Tailwind CSS v4 (CSS-first config in `app/globals.css`), `next-themes` for dark mode                                                 |
| App config DB   | Drizzle ORM + **SQLite** — local/operational config                                                                                  |
| App data DB     | Drizzle ORM + **PostgreSQL** — primary application database                                                                          |
| Auth            | better-auth (follow web-standard security)                                                                                           |
| Package manager | **pnpm** — scripts & pinned deps live in `package.json` (lockfile `pnpm-lock.yaml`; native-build approvals in `pnpm-workspace.yaml`) |
| Language        | TypeScript (strict)                                                                                                                  |

`package.json` is the source of truth for scripts and dependency versions — consult it
(not this file) when in doubt, and keep it updated when adding deps or scripts. Installed
deps include `drizzle-orm` + `drizzle-kit`, `better-sqlite3`, `postgres`, `better-auth`,
and `babel-plugin-react-compiler` (dev).

> **Status:** Drizzle (SQLite + Postgres) and better-auth are installed and wired up.
> Drivers: `better-sqlite3` (config) and `postgres` / postgres.js (app). React Compiler
> is enabled in `next.config.ts`. Implemented features: auth + sessions, the admin area
> (users, permissions), and the **currency/FX**, **inventory**, **shipping**, and
> **sales/orders** modules (see the subsections under _Databases_). See **Where things
> live** below.

## Commands

Use **pnpm** for everything.

```bash
pnpm dev          # start dev server (Turbopack)
pnpm build        # production build (Turbopack)
pnpm start        # serve the production build
pnpm lint         # eslint (next/core-web-vitals + next/typescript)
pnpm typecheck    # tsc --noEmit
pnpm format       # prettier --write **/*.{ts,tsx}
```

Run `pnpm lint` and `pnpm typecheck` before considering a change done.

### Database (Drizzle)

Two independent databases, each with its own drizzle-kit config and migrations
directory. `app` = PostgreSQL (app data + auth); `config` = SQLite (local config).

```bash
pnpm db:app:generate     # diff schema -> SQL migration (drizzle/app)
pnpm db:app:migrate      # apply migrations
pnpm db:app:push         # push schema directly (dev only)
pnpm db:app:studio       # Drizzle Studio
pnpm db:config:generate  # same set for the SQLite config DB (drizzle/config)
# ... db:config:migrate | db:config:push | db:config:studio

pnpm auth:generate       # regenerate better-auth tables -> lib/db/app/auth-schema.ts
```

Copy `.env.example` → `.env.local` and fill in `APP_DATABASE_URL` + `BETTER_AUTH_SECRET`
(`openssl rand -base64 32`) before running the app or DB commands.

### Adding a shadcn component

```bash
pnpm dlx shadcn@latest add <name>   # lands in components/ui/
```

Configured via `components.json` (rsc: true, lucide icons, `@/` aliases). Prefer adding
official shadcn components over hand-rolling primitives.

## Architecture & conventions

### Feature-based directory layout

Organize code by **feature**, not by file type. Keep a feature's server logic, client
logic, components, and schema co-located. Existing features: `auth`, `admin` (users,
permissions, currency/FX), `inventory`, `shipping`, `sales`. Current shape (`auth` is the
worked example):

```
app/
  api/auth/[...all]/route.ts        # better-auth handler (toNextJsHandler)
  api/admin/inventory/route.ts      # route handler: item create + media (large uploads)
features/
  auth/
    server/session.ts          # getServerSession(), requireUser() — "server-only"
    client/use-auth.ts         # useAuth() hook — "use client"
  <feature>/
    components/                 # feature-scoped components
    server/                    # server-only: queries, mutations, server actions
    lib/                       # pure helpers shared client + server (e.g. fx, pricing)
    schema.ts                  # feature's drizzle tables (re-export from lib/db/app/schema)
lib/
  env.ts                       # server-only typed env access
  auth.ts                      # better-auth server instance ("server-only")
  auth-client.ts               # better-auth browser client
  db/
    app/      index.ts schema.ts auth-schema.ts   # Postgres client + schema
    config/   index.ts schema.ts                  # SQLite client + schema
  utils.ts                     # cn()
components/ui/                  # shadcn primitives (generated — avoid hand-editing)
drizzle/{app,config}/          # generated migrations (one dir per database)
drizzle.app.config.ts          # drizzle-kit config — Postgres app DB
drizzle.config.config.ts       # drizzle-kit config — SQLite config DB
```

**Separate server and client helpers.** Server-only modules must start with
`import "server-only"`; client modules/components start with `"use client"`. Never let a
client bundle import server data-access code or secrets. Keep the boundary explicit and
one-directional.

### Data fetching — prefer SSR over client fetch

- **Default to Server Components.** Fetch data on the server (async Server Components,
  server actions) and pass it down. Reach for client-side fetching only for genuinely
  interactive/real-time needs.
- **Caching: moderate, with auto-revalidation.** Don't cache aggressively and don't opt
  everything out. Use time-based revalidation (`revalidate`) for moderately fresh data
  and `revalidateTag` / `revalidatePath` after mutations so changes show up
  automatically. In Next.js 16, caching is explicit — verify the current `fetch` /
  `cache` / `revalidate` semantics in the bundled docs before relying on them.
- Use **server actions** for mutations; revalidate the affected tags/paths in the action.

### Reusable components

Prefer composable, reusable components over one-off duplicates. Lift shared UI into
`components/`. Style with Tailwind utilities + the `cn()` helper (`lib/utils.ts`); use
`class-variance-authority` for variants, matching shadcn's patterns. Use design tokens
(CSS variables in `app/globals.css`) rather than hard-coded colors.

### Databases (Drizzle)

Two isolated Drizzle setups — keep their clients, schemas, and migrations separate:

- **App config → SQLite** (`lib/db/config`, client `configDb`). Operational/local config.
- **App data → PostgreSQL** (`lib/db/app`, client `db`). Primary database + auth tables.

Both clients are `import "server-only"` and cached on `globalThis` for dev HMR. Add a
feature's tables in its own `schema.ts`, then re-export from `lib/db/app/schema.ts` so
the client and drizzle-kit pick them up. Never import a DB client into a Client
Component. After changing a schema, run the matching `db:*:generate` then `db:*:migrate`.

#### Identifier standard — `id` (internal) + `public_id` (client-facing) — REQUIRED

Every table that is exposed to the client **must** follow this two-id convention:

- **`id`** — an auto-incrementing **integer** primary key (`serial`). It is the
  **internal** identifier: use it for foreign keys, joins, and server-side references
  only. **Never** put `id` in a URL, route param, API response, server-action argument,
  or any client-facing surface.
- **`public_id`** — a **UUIDv4**, the **only** identifier exposed to the client. Use it
  in URLs/route params (`/admin/users/[publicId]`), in data passed to Client Components,
  and as the handle for any client-initiated mutation. The server resolves
  `public_id → id` (scoped to the caller where relevant) before touching the database.

Drizzle column shape (let `casing: "snake_case"` emit `public_id`):

```ts
id: serial("id").primaryKey(),
publicId: uuid("public_id").notNull().unique().defaultRandom(),
```

The better-auth tables follow this too: integer ids come from
`advanced.database.generateId: "serial"`, and `public_id` is added to `user`/`session`
via `additionalFields` (`input: false`, auto-generated UUID) so it is server-controlled
and always returned to the client. Internal-only tables (e.g. `verification`) may keep
just `id`. See `lib/db/app/auth-schema.ts` and `lib/auth.ts`.

#### Timestamp standard — `created_at` / `updated_at` — REQUIRED

Every table carries `created_at` and `updated_at` as **`timestamp` (date + time)**
columns — never strings or epoch numbers. `created_at` defaults to now; `updated_at`
defaults to now and **auto-bumps on every update**. Use the shared helper rather than
re-declaring them:

```ts
import { timestamps } from "@/lib/db/app/columns"

export const widget = pgTable("widget", {
  id: serial("id").primaryKey(),
  publicId: uuid("public_id").notNull().unique().defaultRandom(),
  // ...columns...
  ...timestamps(), // -> created_at + updated_at (timestamp, defaultNow, $onUpdate)
})
```

The better-auth tables already use `timestamp` for these (better-auth writes the values
itself, so they keep its generated definitions). `timestamp` is used rather than
date-only `date` because the time component is required (e.g. better-auth's session
expiry comparisons).

**Displaying timestamps — always in the viewer's timezone.** Timestamps are stored and
transmitted as **UTC instants** (serialize with `date.toISOString()` when crossing to the
client). Render them with the **`<LocalTime>`** client component
(`components/local-time.tsx`), which formats with the browser's locale + timezone:

```tsx
<LocalTime value={isoString} dateStyle="medium" timeStyle="short" />
```

**Never format a date in a Server Component** (`toLocaleString` there uses the _server's_
timezone, confusing users elsewhere), and don't hand-roll `<time suppressHydrationWarning>`
— `<LocalTime>` is hydration-safe (deterministic UTC on first paint, device timezone after
mount).

#### Permissions

Fine-grained access control lives in `features/admin`. Permission definitions are a
TypeScript catalog (`features/admin/lib/permissions-catalog.ts`) seeded idempotently into
the `permission` table on startup (`instrumentation.ts` → `lib/db/app/seed-permissions.ts`).
Per-user `allow`/`deny` overrides live in `permission_user`. Resolution
(`features/admin/server/permissions.ts`): SUPER_ADMIN holds everything → an explicit
grant wins → otherwise inherited when the user's role is at/above the permission's
`base_role`. Guard routes with `requirePermission(value)` and actions with
`authorize(value)`; add new permissions to the catalog (they self-seed on next start).

#### Currency & FX (pricing foundation)

The currency module (`features/admin`, `/admin/currency`) is the FX foundation for
pricing. A `rate` is **"units of the currency per 1 unit of the base currency"**; the
base currency has `is_base = true` and `rate = 1`. Convert with
`convert(amount, fromRate, toRate)` (`features/admin/lib/fx.ts`). Conventions:

- **Default base is IDR** (company is Indonesia-based; seeded via
  `features/admin/lib/currency-catalog.ts`). The base is **changeable** —
  `setBaseCurrencyAction` rebases every rate (divides by the new base's rate, new base
  → 1) in a transaction and logs `rebase` history rows. It only rebases FX rates;
  recalculating item/shipping/tax is deferred (see `BACKLOG.md`), so the switch is
  guarded by a warning.
- **Currency `type`**: `standard` (ISO 4217, eligible for the live `open.er-api.com`
  one-click refresh) or `custom` ("OTHER" — admin-defined, **excluded from automatic
  API updates**, manual rates only). The Add form picks the code from a searchable
  ISO list (`features/admin/lib/iso-currencies.ts`) or "Other"; it never free-types a
  standard code.
- Every rate change appends to `currency_rate_history` (`source`: `seed` | `manual` |
  `api` | `rebase`). Display rates with `formatRate` and timestamps with `<LocalTime>`.

#### Inventory (items & dashboard)

The inventory module (`features/inventory`, `/admin/inventory`) is a dashboard
(KPIs, value-by-category and items-by-currency charts, item list) plus item creation.
Tables: `item`, `category`, `item_category` (M2M tags), `item_media`, `item_price_history`.
Conventions:

- An item's `base_price` is in its own `base_currency_id`; convert to other currencies
  with `convert()`. The detail page shows the price in every currency (current) and a
  **historical cross-currency chart** derived from `currency_rate_history` (forward-filled
  — see `getItemPriceSeries`). `minimum_order = 0` marks an item unsellable; `maximum_order`
  null means no cap.
- **Item creation goes through a Route Handler** (`POST /api/admin/inventory`), not a
  Server Action, because videos can be up to 50 MB (Server Actions cap body size). It
  checks `authorize(MANAGE_INVENTORY)` + a same-origin check, validates, then writes
  item+categories+price-history in a transaction and persists media.
- **Media**: images are re-encoded with the shared `compressImageToWebp` (`lib/image.ts`,
  also used by avatars) and stored via `saveItemMedia` under `public/inventory/<itemId>/…`
  (served with `nosniff`). Videos (≤ 50 MB, MP4/WebM) are stored as-is — **no transcoding**
  (deliberately; see `BACKLOG.md`).
- Descriptions can be **algorithmically generated** (`features/inventory/lib/describe.ts`)
  — deterministic templates, **no AI**.
- Items also carry optional **shipping attributes** used by the Shipping module:
  `weight_grams`, `length_cm`/`width_cm`/`height_cm` (volume derived), `hs_code`,
  `country_of_origin`, `fragile`, `hazardous`.
- Permissions: `administrator.page.inventory` (view, baseRole STAFF) and
  `administrator.manage.inventory` (create/manage, baseRole ADMIN).

#### Shipping (third-party forwarders)

The shipping module (`features/shipping`, `/admin/shipping`) registers **third-party
forwarders** — we don't ship ourselves. Tables: `shipping_company`, `shipping_plan`,
`shipping_rate` (tiers). Conventions:

- Each forwarder has its **own base currency** (plan rates are priced in it) and optional
  `min_weight_kg` / `min_volume_m3`. **Shipping uses kg / m³** throughout (companies, plan
  tiers); items use grams / cm — convert at order-evaluation time (`/1000`, `/1e6`).
- A **plan** (selected later when creating an order) has a destination, an estimated
  transit range, a `rate_metric` (weight/volume), a `pricing_mode` (`flat` per bracket or
  `per_unit`), tiered rates (`shipping_rate`: `[from_qty, to_qty)` with a price; null
  `to_qty` = open-ended), and `include_*` flags (import/export tax, handling, insurance).
- Companies + plans are created via **Server Actions** (no media, so no route handler);
  plan creation writes the plan + its tiers in a transaction. Plan descriptions can be
  **algorithmically generated** (`features/shipping/lib/describe-plan.ts`, no AI).
- Plans can be **edited (bulk) or deleted** on the forwarder page. A bulk edit changes
  several fields at once and records one `shipping_plan_event` (a `changes` jsonb array of
  field old→new diffs + a required reason) — the plan's change history. (Contrast with the
  order modification log, which is one value per event.)
- The order/sales module (next) consumes plans to **evaluate shipping price** — flow and
  evaluation rules are in `BACKLOG.md`.
- Permissions: `administrator.page.shipping` (view, baseRole STAFF) and
  `administrator.manage.shipping` (create/manage, baseRole ADMIN).

#### Sales / Orders

The sales module (`features/sales`, `/admin/sales`) creates and tracks orders. Tables:
`order`, `order_item` (snapshotted line items), `order_event` (append-only log).
Conventions:

- **Order code** (`order_code`) is the algorithmic, human-facing id on the invoice —
  distinct from the integer `id` and UUID `public_id` (`lib/order-code.ts`, e.g.
  `ORD-20260620-7KQ2`; the action retries on the rare unique clash).
- **Money**: line items + fees total in `order_currency_id`; the buyer pays
  `paid_amount` in `paid_currency_id`. The invoice converts between them (and skips the
  conversion line when they match). Shipping/plan names + prices are **snapshotted** so a
  past order/invoice stays stable. Shared pricing math lives in `lib/pricing.ts` (used by
  both the live create-order form and the server) — item price → order currency, plus
  tiered `evaluateShippingFee`.
- **Timeline** is templated (`lib/stages.ts`); `at_storage` only applies to international
  orders. Admins **advance one stage** or **set any stage manually** (safety) — each is an
  `order_event` of kind `status`.
- **Modify-with-reason**: scalar order fields are edited via `modifyOrderAction` (field +
  new value + required reason), recorded as an `order_event` of kind `modification` and
  shown as the order's history. Editable fields are listed in `lib/modifiable.ts` (a plain
  module, not the `"use server"` action file).
- **Pre-orders**: `is_pre_order` lets the buyer pay a **down-payment** up front (`paid_amount`),
  entered as an exact amount or a **% of the total**; the "balance due" follows from
  paid-vs-total. A "Same as total" shortcut fills the paid amount from the quote.
- **Invoice** (`/admin/sales/[publicId]/invoice`) is a print-friendly page; the `print:hidden`
  admin chrome + a `window.print()` button use the browser's Save-as-PDF. The PrintButton sets
  `document.title` so the PDF default filename is `[ORDER ID] - [BUYER] - [PAID STATUS] - [DATE]`.
- Permissions: `administrator.page.sales` (view, baseRole STAFF) and
  `administrator.manage.sales` (create/manage, baseRole ADMIN). Order creation goes through
  a Server Action (no large uploads). See `BACKLOG.md` for stock-movement / tax follow-ups.

#### Admin list pages — search / sort / filter

The admin list pages (users, permissions, inventory, shipping, sales) are filtered
**client-side**: the server page renders the full (bounded) list into a client list
component that holds the search/sort/filter state and renders the shared
`<ListToolbar>` (`components/list-toolbar.tsx`) — a presentational search box + sort `Select`

- filter `Select`s. Filter/sort predicates live inside the client component (functions
  aren't serializable across the server→client boundary), so each list owns its own
  `features/.../components/*-list.tsx`. The older `/admin/users` page uses URL-param
  server-side filtering; new lists prefer the client-side toolbar for snappy UX.

#### Demo mode (no external Postgres)

`DEMO_MODE=true` (or simply not setting `APP_DATABASE_URL`) runs the app DB against an
**embedded PostgreSQL** (PGlite, in-process WASM) — no database server to install. On
startup, `instrumentation.ts` → `lib/db/app/demo.ts` applies the Drizzle migrations and
seeds demo accounts (one per role; see `lib/demo.ts`), and the sign-in page shows a
one-click account picker. The data dir is `./.data/demo-pg` (gitignored). The DB client
(`lib/db/app/index.ts`) transparently swaps PGlite for postgres.js based on
`env.isDemoMode`; the rest of the app — including better-auth — is unchanged. **Demo mode
is for local/preview only; use a real Postgres in production.**

### Auth (better-auth) — web-standard security

- Server instance: `lib/auth.ts` (`auth`). Browser client: `lib/auth-client.ts`. All
  endpoints are mounted at `app/api/auth/[...all]/route.ts`. Auth data lives in the
  Postgres app DB via the Drizzle adapter; tables are in `lib/db/app/auth-schema.ts`
  (regenerate with `pnpm auth:generate`). `nextCookies()` must stay the **last** plugin.
- Read the session **on the server**: `getServerSession()` / `requireUser()` from
  `features/auth/server/session.ts`. Use the `useAuth()` client hook only for UI state.
- Web-standard security: httpOnly + `SameSite=lax` session cookies (secure in
  production), CSRF protection on state-changing routes, server-side validation for every
  protected route/action. Never trust client-supplied identity or expose secrets to the
  client bundle.
- Keep secrets in `.env.local` (gitignored); only `.env.example` is committed.

## Design & UI

**Aesthetic — minimalistic and functional.** Take cues from Discord's UI (calm, dense,
dark-friendly, strong hierarchy) **without the clutter**. Lead with whitespace,
elevation, and typography rather than chrome. Every element should earn its place.

**Borders & separators — minimal.** Group and separate with spacing and subtle surfaces
(`bg-muted`, `bg-card`, the `--sidebar` tokens) before reaching for a line. Add a border
or a `<Separator />` **only when it's necessary** — i.e. acting as a deliberate divider
so users can tell distinct regions apart. Never use borders decoratively.

**Responsive menus & overlays — switch by screen size.** Build each menu/overlay once as
a responsive wrapper that picks the right primitive by breakpoint; callers shouldn't
branch:

- **Desktop / large screens →** `Dialog` (or `AlertDialog` for confirmations) for menus.
- **Mobile / small screens →** `Drawer` or `Sheet` for menus.

Drive the switch from a single hook (e.g. a `useIsMobile` / `useMediaQuery` hook in
`hooks/`) so the breakpoint is defined in one place.

**Consistent spacing everywhere.** Gaps, padding, and margins must be consistent across
**all** pages. Stick to a small Tailwind scale (e.g. `gap-2` / `gap-4` / `gap-6`,
`p-4` / `p-6`) — don't invent one-off pixel values. Prefer shared layout primitives /
container components over re-specifying spacing per page.

**Loading states.** For a blocking/async action, show an `AlertDialog` containing a
spinner (lucide `Loader2` with `animate-spin`) and, **when the operation has measurable
progress**, a `Progress` bar. For inline/non-blocking loads, a local spinner or
`Skeleton` is fine.

**Selection controls — never use a native `<select>`.** Use shadcn's `Select`
(`components/ui/select.tsx`) for dropdowns. **When a selection has more than ~10 options,
use a `Combobox`** (`components/ui/combobox.tsx`) instead so it's searchable. In a
`<form>` driven by a Server Action, mirror the chosen value into a hidden `<input>` (the
Radix/Base-UI controls aren't native form fields) so it reaches `FormData` reliably — see
`features/admin/components/create-user-form.tsx`.

**Components come from shadcn.** A broad set is already added under `components/ui/`
(button, dialog, alert-dialog, drawer, sheet, separator, progress, skeleton, select,
combobox, field, checkbox, table, tabs, chart, avatar, badge, popover, calendar, …).
Pull in anything missing rather than hand-rolling it:

```bash
pnpm dlx shadcn@latest add <name>
```

Icons from `lucide-react`. Style with design tokens (`app/globals.css`), never hard-coded
colors.

## Code style

Enforced by Prettier (`.prettierrc`) — run `pnpm format`:

- **No semicolons**, **double quotes**, 2-space indent, `printWidth` 80, `trailingComma: es5`, LF line endings.
- `prettier-plugin-tailwindcss` sorts classes; `cn` and `cva` are treated as Tailwind functions.
- Import via the `@/*` alias (maps to repo root) rather than long relative paths.
- Balance readability and performance — write clear, self-explanatory code; optimize hot
  paths deliberately, not preemptively.
- TypeScript is `strict`. Avoid `any`; type data flowing across the server/client boundary.

## Notes

- `app/globals.css` holds Tailwind v4 config and the full design-token palette (light +
  `.dark`). Edit tokens here, not inline.
- Dark mode: `next-themes` via `components/theme-provider.tsx`.
- Don't hand-edit generated files in `components/ui/` — re-run the shadcn CLI instead.
