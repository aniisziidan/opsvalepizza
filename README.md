# OpsVale — Wholesale Pizza Box Sourcing & Operations

B2B platform for European pizza chains: a public multilingual acquisition website (savings calculator + quote requests) plus an internal operations platform (CRM, quotes, pricing engine, landed cost, logistics, Excel workflows, analytics). **Fast. Simple. Accurate.**

Originally scaffolded as a UI prototype in Google Stitch / AI Studio, now being built out into a production application. See `docs/superpowers/plans/2026-08-25-opsvale-master-plan.md` for the full architecture, data model, and phased roadmap.

## Tech Stack

- **Next.js 15** (App Router, React 19) + **TypeScript**
- **Tailwind CSS v4** (design tokens from `google stich design/opsvale_industrial_supply/DESIGN.md`)
- **PostgreSQL 16** + **Prisma** (ORM, pinned to stable 6.x)
- **Auth.js v5** (NextAuth) — credentials, edge-safe middleware guard on `/admin/**`
- **Zod** (shared client/server validation) · **Vitest** (tests)
- **i18n:** custom typed dictionary system in `lib/i18n` (EN/DE/FR/IT/ES) — not next-intl
- **Files:** local disk / S3 / R2 / MinIO storage adapter · **Email:** Resend API or SMTP (Nodemailer) · **Excel:** SheetJS (`xlsx`)
- **Deployment:** GitHub Actions builds a Docker image → GHCR → the Hostinger VPS pulls it via `deploy.sh` (see [AGENTS.md](./AGENTS.md))

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

## Deployment

Fast, build-off-the-server deploys (see [AGENTS.md](./AGENTS.md) for the full agreement):

1. Branch → PR → **merge to `main`**. Merging triggers **GitHub Actions** (`.github/workflows/deploy.yml`)
   which builds the Docker image and pushes it to **GHCR** (`ghcr.io/aniisziidan/opsvalepizza`, private).
2. On the VPS (`/opt/opsvale`): **`bash deploy.sh`** pulls the prebuilt image, **backs up the database**,
   runs **`prisma migrate deploy`**, and health-checks. The server never builds the image.
3. Rollback: `IMAGE_TAG=<git-sha> bash deploy.sh`.

## Build status

All originally planned phases (0–7) plus a notification center and visitor analytics are implemented:
multilingual public site, calculator, quote flow, CRM, quote/proposal lifecycle, pricing + Excel admin,
logistics, i18n, legal/consent, analytics, and CI/CD image delivery. Build is green and the Vitest suite
passes. A 2026-08-29 hardening pass addressed the high-priority audit findings — safe migrations + DB
backups, server-side analytics consent, wired GDPR retention purge, nonce-based CSP on dynamic routes,
a unified TRUST_PROXY-aware rate limiter, fail-closed cron auth, opt-in Caddy TLS, and a sitemap. For a
full, evidence-based status — including the remediation log (§0) and remaining gaps — see
[`COMPLETE_PROJECT_AUDIT.md`](./COMPLETE_PROJECT_AUDIT.md).
