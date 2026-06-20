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

| Concern        | Choice |
| -------------- | ------ |
| Framework      | Next.js 16 (App Router), **Turbopack** (default in dev *and* build — no `--turbopack` flag needed) |
| UI runtime     | React 19 (stable) with **React Compiler** |
| Components     | shadcn/ui (`radix-nova` style, `mauve` base) built on Radix UI primitives |
| Icons          | lucide-react |
| Styling        | Tailwind CSS v4 (CSS-first config in `app/globals.css`), `next-themes` for dark mode |
| App config DB  | Drizzle ORM + **SQLite** — local/operational config |
| App data DB    | Drizzle ORM + **PostgreSQL** — primary application database |
| Auth           | better-auth (follow web-standard security) |
| Package manager| **pnpm** — scripts & pinned deps live in `package.json` (lockfile `pnpm-lock.yaml`; native-build approvals in `pnpm-workspace.yaml`) |
| Language       | TypeScript (strict) |

`package.json` is the source of truth for scripts and dependency versions — consult it
(not this file) when in doubt, and keep it updated when adding deps or scripts. Installed
deps include `drizzle-orm` + `drizzle-kit`, `better-sqlite3`, `postgres`, `better-auth`,
and `babel-plugin-react-compiler` (dev).

> **Status:** Drizzle (SQLite + Postgres) and better-auth are installed and wired up.
> Drivers: `better-sqlite3` (config) and `postgres` / postgres.js (app). React Compiler
> is enabled in `next.config.ts`. See **Where things live** below.

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
logic, components, and schema co-located. Current shape (the `auth` feature is the
worked example):

```
app/
  api/auth/[...all]/route.ts   # better-auth handler (toNextJsHandler)
features/
  auth/
    server/session.ts          # getServerSession(), requireUser() — "server-only"
    client/use-auth.ts         # useAuth() hook — "use client"
  <feature>/
    components/                 # feature-scoped components
    server/                    # server-only: queries, mutations, server actions
    client/                    # client-only: hooks, client helpers, client components
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

**Never format a date in a Server Component** (`toLocaleString` there uses the *server's*
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

**Components come from shadcn.** Only `button` is added so far — pull in the rest as
needed and don't hand-roll them:

```bash
pnpm dlx shadcn@latest add dialog alert-dialog drawer sheet separator progress skeleton
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
- Dark mode: `next-themes` via `components/theme-provider.tsx` (press `d` to toggle).
- Don't hand-edit generated files in `components/ui/` — re-run the shadcn CLI instead.
