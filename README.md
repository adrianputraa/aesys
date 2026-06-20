# aesys

A minimal, security-focused **Next.js 16** starter with full email/password
authentication, per-device session management, an admin area, and a runtime,
database-backed **permission system** — all runnable with **zero external
services** thanks to a built-in demo database.

> Built on Next.js 16 (App Router, Turbopack, React Compiler), React 19,
> better-auth, Drizzle ORM, and shadcn/ui.

---

## Highlights

- **Authentication** (better-auth, email + password) — sign-in, secure logout,
  passwords hashed with **scrypt**.
- **Sessions & devices** — users see every active session (browser, OS, IP,
  sign-in time) and can revoke any device or "log out everywhere". Revocation is
  **immediate** (no cookie cache).
- **Password management** — change while signed in, plus a **forgot-password**
  email flow (request → emailed link → reset), which revokes all sessions.
- **Account restriction** — admins can restrict (ban) an account: sign-in is
  blocked with a clear message and **all of the user's sessions are revoked
  immediately on every device**.
- **Profiles & avatars** — upload a profile picture; compressed on the client
  for the network **and** re-encoded server-side with `sharp` (square WebP) so
  every stored image is guaranteed small and sanitized.
- **Admin area** (`/admin`) — a **User module** (search/filter, full detail,
  create, edit every field, set password / send reset, restrict, force-revoke
  sessions, manage avatar) and a **Permission module**.
- **Permission system** — fine-grained `administrator.*` permissions seeded into
  the database on startup. Each permission has a base role that inherits it, plus
  explicit per-user **allow/deny** overrides; `SUPER_ADMIN` holds everything.
  Every admin route and action is permission-gated.
- **Roles** — `GUEST · CUSTOMER · MERCHANT · STAFF · ADMIN · SUPER_ADMIN`.
- **Demo mode** — run the whole app with **no Postgres to install**; an embedded
  database is migrated and seeded automatically and the sign-in page offers
  one-click demo accounts.

## Tech stack

| Concern         | Choice                                                       |
| --------------- | ------------------------------------------------------------ |
| Framework       | Next.js 16 (App Router, **Turbopack**)                       |
| UI runtime      | React 19 + **React Compiler**                                |
| Components      | shadcn/ui (`radix-nova`) on Radix UI + Base UI, lucide icons |
| Styling         | Tailwind CSS v4 (CSS-first), `next-themes` dark mode         |
| Auth            | better-auth (+ admin plugin) — web-standard security         |
| App database    | Drizzle ORM + **PostgreSQL** (primary data + auth)           |
| Config database | Drizzle ORM + **SQLite** (operational/local config)          |
| Demo database   | **PGlite** — embedded Postgres (WASM), no server needed      |
| Image pipeline  | `sharp` (server) + Canvas (client)                           |
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
| -------------------------------- | ------------------------------------------------------------ |
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
  admin/           admin area: users module + permissions module
  api/auth/        better-auth handler
features/
  auth/            session helpers, server actions, validation, components
  admin/           user management, permission system, admin schema
lib/
  auth.ts          better-auth server instance (hardened)
  permissions.ts   role access-control map
  db/app|config/   Drizzle clients, schema, migrations, seeding
  storage.ts       avatar file storage (magic-byte validated)
components/         shared UI (shadcn primitives, LocalTime, page shells)
proxy.ts            Next 16 route protection (optimistic)
instrumentation.ts  startup migrate + seed (demo accounts, permissions)
drizzle/app|config/ generated migrations
```

## Conventions

- **Identifiers** — every client-facing table has an internal integer `id`
  (server-only) **and** a `public_id` UUIDv4 (the only id exposed to clients /
  used in URLs).
- **Timestamps** — stored as UTC; rendered in the **viewer's device timezone**
  via the `<LocalTime>` component (never formatted in a Server Component).
- **Permissions** — defined in a TypeScript catalog and seeded idempotently on
  startup; guard routes with `requirePermission(value)` and actions with
  `authorize(value)`.

See [`CLAUDE.md`](./CLAUDE.md) for the full contributor guide and architecture
notes.

## Security

- Passwords hashed with scrypt; httpOnly + `SameSite=lax` cookies (secure in
  production).
- CSRF: better-auth Origin allow-list + Next.js Server Action same-origin checks.
- Rate limiting on auth endpoints in production.
- Optimistic edge route protection (`proxy.ts`) backed by **authoritative**
  server-side permission checks on every protected route and action.
- Session revocation and account restriction take effect immediately (no cookie
  cache).
- Uploaded images are validated by magic bytes (PNG/JPEG/WebP only) and served
  with `X-Content-Type-Options: nosniff`.

---

_This project is private and not currently licensed for redistribution._
