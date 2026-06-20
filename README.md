# aesys

A security-focused **Next.js 16** business-operations app: full email/password
authentication and device/session management, a database-backed **permission
system**, and admin modules for **currency/FX, inventory, shipping forwarders,
and sales/orders with printable invoices** — all runnable with **zero external
services** thanks to a built-in demo database.

> Built on Next.js 16 (App Router, Turbopack, React Compiler), React 19,
> better-auth, Drizzle ORM, and shadcn/ui.

---

## Highlights

### Platform & security

- **Authentication** (better-auth, email + password) — sign-in, secure logout,
  passwords hashed with **scrypt**. No public sign-up; admins create accounts.
- **Sessions & devices** — users see every active session (browser, OS, IP,
  sign-in time) and can revoke any device or "log out everywhere". Revocation is
  **immediate** (no cookie cache).
- **Password management** — change while signed in, plus a **forgot-password**
  email flow (request → emailed link → reset), which revokes all sessions.
- **Account restriction** — admins can restrict (ban) an account: sign-in is
  blocked and **all of the user's sessions are revoked immediately** everywhere.
- **Profiles & avatars** — upload a profile picture; re-encoded server-side with
  `sharp` (square WebP) so every stored image is small and sanitized.
- **Roles** — `GUEST · CUSTOMER · MERCHANT · STAFF · ADMIN · SUPER_ADMIN`.
- **Permission system** — fine-grained `administrator.*` permissions seeded into
  the database on startup. Each has a base role that inherits it, plus explicit
  per-user **allow/deny** overrides; `SUPER_ADMIN` holds everything. Every admin
  route and action is permission-gated. A searchable **user-picker** grants
  permissions to registered users.

### Admin modules (`/admin`)

- **Users** — search/filter, full detail, create, edit every field, set password
  / send reset, restrict, force-revoke sessions, manage avatar.
- **Permissions** — view/manage which permissions each role/user holds.
- **Currency / FX** — register currencies with a base currency (default **IDR**,
  changeable), set rates manually or **one-click refresh** from a free no-key
  exchange-rate API, per-currency rate **history charts**, and a 24-hour change
  view. `convert()` powers all cross-currency pricing.
- **Inventory** — a dashboard (KPIs, **sales & movement**, searchable item list)
  plus items with description (algorithmically generated, no AI), pricing in any
  currency, categories/tags, **images & videos**, stock and order limits, and
  shipping attributes (weight, dimensions, HS code, origin, fragile/hazardous).
  Items show **current + historical cross-currency pricing**.
- **Shipping** — register third-party **forwarders** (we don't ship ourselves)
  and define **plans** with destinations, transit estimates, tiered rates
  (by weight/volume, flat or per-unit), and tax/handling/insurance flags. Plans
  are editable in bulk with a **change history**.
- **Sales / Orders** — create an order (select items → forwarder plan →
  **auto-calculated fees**), track a **templated timeline** (advance one stage or
  set manually), **pre-orders with down-payments** (exact or % of total), modify
  values **with a reason** (audited history), and generate a **print/PDF
  invoice** with paid-vs-order currency conversion.

### Developer experience

- **Demo mode** — run the whole app with **no Postgres to install**; an embedded
  database is migrated and seeded automatically, with a self-healing data dir and
  a one-click demo-account picker on the sign-in page.
- Every admin list page has **client-side search, sort, and filter**.

## Tech stack

| Concern         | Choice                                                       |
| --------------- | ------------------------------------------------------------ |
| Framework       | Next.js 16 (App Router, **Turbopack**)                       |
| UI runtime      | React 19 + **React Compiler**                                |
| Components      | shadcn/ui (`radix-nova`) on Radix UI + Base UI, lucide icons |
| Forms           | react-hook-form + zod (shadcn `Field`)                       |
| Charts          | recharts (via shadcn `chart`)                                |
| Styling         | Tailwind CSS v4 (CSS-first), `next-themes` dark mode         |
| Auth            | better-auth (+ admin plugin) — web-standard security         |
| App database    | Drizzle ORM + **PostgreSQL** (primary data + auth)           |
| Config database | Drizzle ORM + **SQLite** (operational/local config)          |
| Demo database   | **PGlite** — embedded Postgres (WASM), no server needed      |
| Media           | `sharp` images → WebP; videos stored as-is (≤ 50 MB)         |
| Language        | TypeScript (strict)                                          |
| Package manager | **pnpm**                                                     |

---

## Quick start

### Option A — Demo mode (no database to install)

```bash
pnpm install
cp .env.example .env.local   # DEMO_MODE=true is already set
pnpm dev
```

Open <http://localhost:3000/sign-in> and pick a demo account (password
`demo1234` for all). `admin@demo.test` is a `SUPER_ADMIN` with full access. The
embedded database lives in `./.data/demo-pg` (gitignored) and is migrated and
seeded automatically on first start.

### Option B — Real PostgreSQL

```bash
pnpm install
cp .env.example .env.local   # set APP_DATABASE_URL + BETTER_AUTH_SECRET, unset DEMO_MODE
pnpm db:app:migrate          # apply migrations
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password' pnpm db:app:create-admin
pnpm dev
```

There is no public sign-up — the first `SUPER_ADMIN` is seeded with
`db:app:create-admin`, and all further accounts are created from the admin
**User module**.

## Configuration

Copy `.env.example` → `.env.local`. Key variables:

| Variable                         | Purpose                                                       |
| -------------------------------- | ------------------------------------------------------------- |
| `DEMO_MODE`                      | `true` runs the embedded PGlite database (no Postgres needed) |
| `APP_DATABASE_URL`               | PostgreSQL connection string (when not in demo mode)          |
| `BETTER_AUTH_SECRET`             | Signing secret — `openssl rand -base64 32` (≥ 32 chars)       |
| `BETTER_AUTH_URL`                | Public origin (seeds the CSRF trusted-origins allow-list)     |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used by `db:app:create-admin` to seed the first admin         |

Secrets live in `.env.local` (gitignored); only `.env.example` is committed.

## Common commands

```bash
pnpm dev                 # start dev server (Turbopack)
pnpm build               # production build
pnpm start               # serve the production build
pnpm lint                # eslint
pnpm typecheck           # tsc --noEmit
pnpm format              # prettier

pnpm db:app:generate     # diff schema -> SQL migration (Postgres)
pnpm db:app:migrate      # apply migrations
pnpm db:app:create-admin # seed the first SUPER_ADMIN (real Postgres)
pnpm auth:generate       # regenerate better-auth tables
```

## Project structure

```
app/
  (auth)/          sign-in, forgot-password, reset-password
  (app)/           profile, settings (signed-in shell)
  admin/           users · permissions · currency · inventory · shipping · sales
  api/
    auth/          better-auth handler
    admin/inventory route handler for item creation + media (large uploads)
features/
  auth/            session helpers, server actions, validation, components
  admin/           users, permissions, currency/FX, admin schema
  inventory/       items, categories, media, pricing history, dashboard
  shipping/        forwarders, plans, tiered rates, plan history
  sales/           orders, line items, timeline, modifications, invoice
lib/
  auth.ts          better-auth server instance (hardened)
  permissions.ts   role access-control map
  db/app|config/   Drizzle clients, schema, migrations, seeding
  storage.ts       avatar + item-media file storage (magic-byte validated)
  image.ts         shared sharp WebP compression
components/         shared UI (shadcn primitives, LocalTime, ListToolbar, …)
proxy.ts            Next 16 route protection (optimistic)
instrumentation.ts  startup migrate + seed (accounts, permissions, currencies)
drizzle/app|config/ generated migrations
```

## Conventions

- **Identifiers** — every client-facing table has an internal integer `id`
  (server-only) **and** a `public_id` UUIDv4 (the only id exposed to clients /
  used in URLs). Orders also carry an algorithmic human-facing `order_code`.
- **Timestamps** — stored as UTC; rendered in the **viewer's device timezone**
  via the `<LocalTime>` component (never formatted in a Server Component).
- **Permissions** — defined in a TypeScript catalog and seeded idempotently on
  startup; guard routes with `requirePermission(value)` and actions with
  `authorize(value)`.
- **Currency** — `rate` is "units per 1 base unit"; convert with `convert()`.
  Shipping uses kg/m³; items use grams/cm (converted at order evaluation).

See [`CLAUDE.md`](./CLAUDE.md) for the full contributor guide and architecture
notes, and [`BACKLOG.md`](./BACKLOG.md) for deferred work.

## Security

- Passwords hashed with scrypt; httpOnly + `SameSite=lax` cookies (secure in
  production).
- CSRF: better-auth Origin allow-list, Next.js Server Action same-origin checks,
  and an explicit same-origin check on the inventory media route handler.
- Rate limiting on auth endpoints in production.
- Optimistic edge route protection (`proxy.ts`) backed by **authoritative**
  server-side permission checks on every protected route and action.
- Session revocation and account restriction take effect immediately (no cookie
  cache).
- Uploaded images are validated by magic bytes and re-encoded; user-uploaded
  files are served with `X-Content-Type-Options: nosniff`.

---

_This project is private and not currently licensed for redistribution._
