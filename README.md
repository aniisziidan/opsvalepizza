# OpsVale — Wholesale Pizza Box Sourcing & Operations

B2B platform for European pizza chains: a public multilingual acquisition website (savings calculator + quote requests) plus an internal operations platform (CRM, quotes, pricing engine, landed cost, logistics, Excel workflows, analytics). **Fast. Simple. Accurate.**

Originally scaffolded as a UI prototype in Google Stitch / AI Studio, now being built out into a production application. See `docs/superpowers/plans/2026-08-25-opsvale-master-plan.md` for the full architecture, data model, and phased roadmap.

## Tech Stack

- **Next.js 15** (App Router, React 19) + **TypeScript**
- **Tailwind CSS v4** (design tokens from `google stich design/opsvale_industrial_supply/DESIGN.md`)
- **PostgreSQL 16** + **Prisma** (ORM, pinned to stable 6.x)
- **Auth.js v5** (NextAuth) — credentials, edge-safe middleware guard on `/admin/**`
- **Zod** (shared client/server validation) · **Vitest** (tests)
- Planned: next-intl (i18n), MinIO/S3 (files), Nodemailer/SMTP (email), SheetJS (Excel)
- **Deployment target:** Docker Compose (web + postgres + minio + nginx) on a Hostinger VPS

## Project layout

```
app/
  (marketing)/        public site: home, products, how-it-works, about
  calculator/         savings calculator (server-driven pricing)
  quote/              multi-step quote request
  admin/              internal ops platform (auth-guarded)
  api/                route handlers (calculator, auth)
components/            UI components (public + admin/)
lib/
  pricing/            markup hierarchy, landed cost → selling range, public range
  calculator/         savings formulas, API response shaping
  validation/         Zod schemas
  auth.ts, db.ts      Auth.js config + Prisma singleton
prisma/               schema, migrations, seed
docs/superpowers/plans/   implementation plans (master + per-phase)
```

## Run locally

**Prerequisites:** Node.js 20+ and a PostgreSQL 16 instance (Docker recommended).

1. **Install dependencies**
   ```
   npm install
   ```

2. **Start a local Postgres** (Docker)
   ```
   docker run --name opsvale-pg -e POSTGRES_USER=opsvale -e POSTGRES_PASSWORD=opsvale -e POSTGRES_DB=opsvale -p 5432:5432 -d postgres:16
   ```

3. **Configure environment** — copy `.env.example` to `.env` and set:
   ```
   DATABASE_URL="postgresql://opsvale:opsvale@localhost:5432/opsvale?schema=public"
   AUTH_SECRET="<generate: openssl rand -base64 32>"
   ```

4. **Apply migrations and seed data**
   ```
   npx prisma migrate deploy
   npx prisma db seed
   ```

5. **Run the dev server**
   ```
   npm run dev
   ```
   - Public site: http://localhost:3000
   - Admin portal: http://localhost:3000/admin/login — seeded login `admin@opsvale.com` / `ChangeMe!2026` (change this before any real deployment)

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm run start` — production build / serve (standalone output)
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm test` — Vitest

## Build status

Phases 0–2 complete (Next.js migration, DB + auth boundary, server-side pricing engine + calculator API). Remaining: quote persistence + files + email, CRM, pricing/Excel admin, i18n + legal, analytics + VPS deploy. Progress and commit references are tracked in the master plan roadmap.
