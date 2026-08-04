# BotalSePaisa Operations Portal

An internal operations portal for the BotalSePaisa team to manage partner shops, record weekly plastic bottle collections (in kg), automatically calculate payments, and generate weekly payment reports.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080; runs prisma push + build + start)
- `pnpm --filter @workspace/operations-portal run dev` — run the frontend (port 23010)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Default Login

- **Username:** `admin`
- **Password:** `botalsepaisa123`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, React Query, Wouter router
- API: Express 5
- DB: SQLite (via Prisma ORM) — database file at `artifacts/api-server/prisma/dev.db`
- Auth: JWT (jsonwebtoken) + bcryptjs — token stored in localStorage as `bsp_token`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)

## Where things live

- Frontend pages: `artifacts/operations-portal/src/pages/`
- API routes: `artifacts/api-server/src/routes/`
- Prisma schema: `artifacts/api-server/prisma/schema.prisma`
- Auth middleware: `artifacts/api-server/src/middlewares/auth.ts`
- Seed script (admin user + settings): `artifacts/api-server/src/lib/seed.ts` — runs automatically on server start
- OpenAPI spec: `lib/api-spec/openapi.yaml`

## Architecture decisions

- SQLite + Prisma chosen for simplicity and portability; easily migratable to PostgreSQL/FastAPI backend
- JWT stored in localStorage; custom-fetch.ts reads it and injects the Bearer header on all API calls
- Prices are captured at collection time (not computed from current settings) so historical data is preserved when rates change
- Shop IDs auto-generated as BSP0001, BSP0002, etc.
- Admin user and default settings are auto-seeded on every server start (idempotent)

## Product

- **Dashboard** — summary cards + recent collections
- **Shops** — add/edit/delete/search partner shops
- **Collection Entry** — record kg collected, auto-calculate ₹ amount at current rate
- **Reports** — weekly/monthly table with payment status tracking
- **Settings** — configure price per kg (default ₹12)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing the OpenAPI spec, always re-run `pnpm --filter @workspace/api-spec run codegen` before editing routes or frontend code
- The Prisma schema uses a hardcoded SQLite path (`file:./dev.db`) relative to the prisma directory
- `pnpm approve-builds` was run to allow Prisma build scripts; `@prisma/client`, `@prisma/engines`, and `prisma` are in `onlyBuiltDependencies` in `pnpm-workspace.yaml`
- OpenAPI spec uses `type: number` (not `type: integer`) to avoid Zod v3 / Orval 8 incompatibility (`zod.int()` doesn't exist in v3)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
