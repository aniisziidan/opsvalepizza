# OpsVale Platform — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each phase task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This is a master plan.** It contains the full architecture, data model, security boundaries, and a phased roadmap. **Phase 0 and Phase 1 are specified at bite-sized task granularity and are ready to execute.** Phases 2–7 are scoped here and each MUST be expanded into its own detailed plan document (using the writing-plans skill) immediately before that phase is executed — this avoids placeholder tasks and lets later phases build on decisions locked in by earlier ones.

**Goal:** Turn the existing Stitch/AI-Studio front-end prototype into the production OpsVale B2B platform described in the master spec: a multilingual public acquisition website plus a secure internal operations platform (CRM, quotes, pricing engine, landed cost, logistics, Excel workflows, analytics), sharing one database and business-logic layer.

**Architecture:** Migrate the current Vite SPA to **Next.js (App Router)** so the public site and the internal admin platform live in one codebase but are split by route group, with all pricing/landed-cost logic executed **server-side only** (never shipped to the browser). PostgreSQL + Prisma is the single source of truth; the public calculator and quote flow write to it through server actions/route handlers; admin reads/writes through authenticated server code. Deployed as a Docker Compose stack (Next.js standalone + Postgres + MinIO + Nginx) on the Hostinger VPS.

**Tech Stack:** Next.js 15 (App Router, React 19), TypeScript, Tailwind CSS v4, Prisma + PostgreSQL 16, Auth.js (NextAuth v5) credentials, next-intl (EN/DE/FR/IT/ES), Zod (shared validation), SheetJS/`xlsx` (Excel), MinIO/S3 (files, presigned uploads), Nodemailer over Hostinger SMTP (email), lucide-react + Material Symbols, Vitest + Playwright (tests), Docker Compose + Nginx (deploy).

---

## 0. Current State (baseline to migrate from)

- Vite 6 + React 19 + Tailwind v4 SPA. All UI lives in `src/`. No backend, DB, auth, i18n, email, or file storage.
- `App.tsx` switches between public and admin views with `useState`; **admin ships in the public bundle** (must be fixed).
- Data is in-memory `src/data/mockData.ts`. Calculator math and pricing are hardcoded client-side.
- Design system is solid and faithful to `google stich design/opsvale_industrial_supply/DESIGN.md` — **keep the visual layer, replace everything under it.**
- CRM status enum in code (`New→Reviewing→Quoted→Negotiation→Closed Won→Closed Lost`) **does not match the spec** — must become `New→Reviewing→Need More Information→Quote Prepared→Quote Sent→Negotiating→Won→Lost`.
- Stitch reference designs (source of truth for visual fidelity) live in `google stich design/*/code.html` + `screen.png` for: homepage, savings_calculator, request_an_exact_quote, admin_dashboard, lead_profile_crm, pricing_excel_management.

## 1. Target Architecture

### Route groups (Next.js App Router)
```
app/
  [locale]/                     # public site, next-intl locale segment
    (marketing)/                # home, products, how-it-works, about, legal
    calculator/                 # savings calculator
    quote/                      # multi-step quote request
    layout.tsx                  # public TopNav + Footer + language selector
  admin/                        # NOT under [locale]; English-only internal tool
    (protected)/                # everything here requires an authenticated admin session
      dashboard/ leads/ leads/[id]/ quotes/ pricing/ landed-costs/ logistics/ excel/ analytics/ settings/
    login/
    layout.tsx                  # admin SideNav; middleware-guarded
  api/                          # route handlers (webhooks, file presign, excel, email)
```

### Security boundary (spec §42, §30, §47 — non-negotiable)
- **All landed-cost and markup math runs only in server code** (`lib/pricing/**` imported exclusively by server components / route handlers / server actions). The public calculator endpoint returns **only** an approved public price range + derived savings — never landed cost, never markup %.
- `middleware.ts` protects every `/admin/**` path except `/admin/login`; unauthenticated requests redirect to login.
- Uploaded files stored in object storage (MinIO), never in a public web root; served via short-lived presigned URLs.
- Server-side Zod validation on every mutation; positive quantities, valid EUR, logical dimensions, email format, file type/size (spec §41).
- Secrets in `.env` (never committed); rate limiting on public POST endpoints (calculator, quote submit).

### Shared business-logic layer
`lib/` is framework-agnostic and unit-tested in isolation:
- `lib/pricing/` — landed cost assembly, markup hierarchy resolution, public range computation.
- `lib/calculator/` — savings formulas (per spec §9).
- `lib/validation/` — Zod schemas shared by client forms and server handlers.
- `lib/excel/` — parse, validate, diff, and template generation.

## 2. Complete Data Model (Prisma) — spec §35

This is the canonical schema. Phase 1 creates it; later phases add only migrations, not redesigns.

```prisma
// prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model AdminUser {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String
  role          Role     @default(SUPER_ADMIN)   // future-proofed; single admin at launch
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())
  activities    LeadActivity[]                    // future multi-user attribution
}
enum Role { SUPER_ADMIN SALES PRICING VIEWER }

model Country {
  id        String  @id @default(cuid())
  code      String  @unique   // ISO-3166 alpha-2
  name      String
  active    Boolean @default(true)
  cities    City[]
  landedCosts LandedCost[]
  pricingRules PricingRule[]
  logisticsCosts LogisticsCost[]
}
model City {
  id        String  @id @default(cuid())
  countryId String
  country   Country @relation(fields: [countryId], references: [id])
  name      String
  active    Boolean @default(true)
}

model BoxConfig {                                 // Products / box configurations
  id         String  @id @default(cuid())
  sizeLabel  String                               // e.g. "32cm" / "12-inch"
  lengthMm   Int?
  widthMm    Int?
  heightMm   Int?
  material   Material                             // KRAFT | WHITE
  print      PrintType                            // PLAIN | PRINTED
  active     Boolean @default(true)
  landedCosts LandedCost[]
  pricingRules PricingRule[]
  @@unique([sizeLabel, material, print])
}
enum Material { KRAFT WHITE }
enum PrintType { PLAIN PRINTED }

model PricingRule {                               // markup hierarchy, spec §29
  id          String   @id @default(cuid())
  scope       RuleScope                           // GLOBAL | COUNTRY | PRODUCT
  countryId   String?
  country     Country? @relation(fields: [countryId], references: [id])
  boxConfigId String?
  boxConfig   BoxConfig? @relation(fields: [boxConfigId], references: [id])
  markupMin   Decimal  @db.Decimal(4,3)           // 0.150–0.450
  markupMax   Decimal  @db.Decimal(4,3)
  effectiveFrom DateTime @default(now())
  active      Boolean  @default(true)
}
enum RuleScope { GLOBAL COUNTRY PRODUCT }

model LandedCost {                                // spec §27
  id          String   @id @default(cuid())
  boxConfigId String
  boxConfig   BoxConfig @relation(fields: [boxConfigId], references: [id])
  countryId   String
  country     Country  @relation(fields: [countryId], references: [id])
  qtyTierMin  Int
  qtyTierMax  Int?
  costEur     Decimal  @db.Decimal(10,4)
  source      CostSource                          // MANUAL | DYNAMIC
  effectiveFrom DateTime @default(now())
  active      Boolean  @default(true)
}
enum CostSource { MANUAL DYNAMIC }

model PublicPriceRange {                          // approved public range, spec §30
  id          String   @id @default(cuid())
  boxConfigId String
  countryId   String
  minEur      Decimal  @db.Decimal(10,4)
  maxEur      Decimal  @db.Decimal(10,4)
  isManualOverride Boolean @default(false)
  active      Boolean  @default(true)
  @@unique([boxConfigId, countryId])
}

model LogisticsCost {                             // spec §34
  id         String  @id @default(cuid())
  countryId  String
  country    Country @relation(fields: [countryId], references: [id])
  route      String?
  port       String?
  shipMethod String?
  freightEur Decimal? @db.Decimal(10,4)
  inlandEur  Decimal? @db.Decimal(10,4)
  otherEur   Decimal? @db.Decimal(10,4)
  active     Boolean @default(true)
}

model Company {                                   // spec §35
  id          String @id @default(cuid())
  name        String
  website     String?
  branchCount Int?
  contacts    Contact[]
  leads       Lead[]
}
model Contact {
  id        String @id @default(cuid())
  companyId String
  company   Company @relation(fields: [companyId], references: [id])
  name      String
  email     String
  phone     String?
  jobTitle  String?
}

model Lead {
  id          String   @id @default(cuid())
  code        String   @unique                    // human ref e.g. OPS-2026-0001
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])
  contactId   String
  status      LeadStatus @default(NEW)
  source      String   @default("calculator")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  calcData    CalculatorSnapshot?
  quoteRequest QuoteRequest?
  quotes      Quote[]
  activities  LeadActivity[]
  files       StoredFile[]
}
enum LeadStatus { NEW REVIEWING NEED_MORE_INFO QUOTE_PREPARED QUOTE_SENT NEGOTIATING WON LOST }

model CalculatorSnapshot {                         // original calculator data, spec §23
  id            String  @id @default(cuid())
  leadId        String  @unique
  lead          Lead    @relation(fields: [leadId], references: [id])
  countryCode   String
  boxSize       String
  material      Material
  print         PrintType
  boxesPerOrder Int
  monthlyVolume Int
  currentPrice  Decimal @db.Decimal(10,4)
  estMinEur     Decimal @db.Decimal(10,4)
  estMaxEur     Decimal @db.Decimal(10,4)
  estYearlySavings Decimal @db.Decimal(12,2)
  createdAt     DateTime @default(now())
}

model QuoteRequest {                               // submitted exact requirements, spec §11
  id           String  @id @default(cuid())
  leadId       String  @unique
  lead         Lead    @relation(fields: [leadId], references: [id])
  lengthMm     Int
  widthMm      Int
  heightMm     Int
  material     Material
  print        PrintType
  qtyPerOrder  Int
  deliveryCountryCode String
  deliveryCity String
  notes        String?
  submittedAt  DateTime @default(now())
}

model Quote {                                      // internally-recorded quotes, spec §25-26
  id          String   @id @default(cuid())
  leadId      String
  lead        Lead     @relation(fields: [leadId], references: [id])
  revision    Int                                  // 1,2,3...
  unitPriceEur Decimal @db.Decimal(10,4)
  qty         Int
  specs       String?
  notes       String?
  status      QuoteStatus @default(DRAFT)
  createdAt   DateTime @default(now())
  @@unique([leadId, revision])
}
enum QuoteStatus { DRAFT SENT ACCEPTED REJECTED SUPERSEDED }

model LeadActivity {                               // timestamped history, spec §24
  id          String   @id @default(cuid())
  leadId      String
  lead        Lead     @relation(fields: [leadId], references: [id])
  authorId    String?
  author      AdminUser? @relation(fields: [authorId], references: [id])
  type        ActivityType
  content     String
  createdAt   DateTime @default(now())
}
enum ActivityType { NOTE STATUS_CHANGE QUOTE_CREATED QUOTE_REVISED FILE_UPLOAD SUBMISSION EMAIL SYSTEM }

model StoredFile {                                 // spec §35 files
  id         String  @id @default(cuid())
  leadId     String
  lead       Lead    @relation(fields: [leadId], references: [id])
  storageKey String                                // MinIO object key
  fileName   String
  mimeType   String
  sizeBytes  Int
  createdAt  DateTime @default(now())
}
```

## 3. Phase Roadmap

**Status as of 2026-08-25** — all work on branch `feat/nextjs-foundation`. Phases 0–2 complete, reviewed (two-stage: spec + code quality), and passing (24 tests, build/typecheck green).

| Phase | Name | Outcome | Status |
|---|---|---|---|
| 0 | Foundation: repo + Next.js migration | Next.js app runs, existing UI ported, public/admin route split, git initialised | ✅ **DONE** (commits 98cf00a→e8fb9f6, +cc4bf1a fixes) |
| 1 | Database + auth boundary | Postgres+Prisma live, schema migrated, admin login works, middleware guards `/admin` | ✅ **DONE** (5391d4a, +1ac0b14 indexes/hardening) |
| 2 | Pricing engine + calculator API | Server-side landed cost + markup hierarchy + public range; calculator hits real API | ✅ **DONE** (cabd7fb→e1631ad, +a8d03a9 seed) — plan: `2026-08-25-opsvale-phase2-pricing-calculator.md` |
| 3 | Quote flow persistence | Multi-step quote writes Lead/Company/QuoteRequest, file upload to MinIO, email notify | ⏭ TODO — own plan |
| 4 | CRM + quotes + activity | Leads list/detail, correct pipeline, notes, quote revisions, quote history | ⏭ TODO — own plan |
| 5 | Pricing/landed-cost/logistics admin + Excel | Manual editors + download→edit→validate→preview→confirm + add-new import | ⏭ TODO — own plan |
| 6 | i18n + legal/consent | Real EN/DE/FR/IT/ES catalogs, language selector, privacy/cookie/terms, cookie consent | ⏭ TODO — own plan |
| 7 | Analytics + hardening | Dashboard KPIs/analytics from DB, rate limiting, security review, Docker deploy to VPS | ⏭ TODO — own plan |

Each ⏭ phase gets a `docs/superpowers/plans/<date>-opsvale-phaseN-<name>.md` written just before execution.

---

## PHASE 0 — Foundation: repo + Next.js migration

**Files:**
- Create: `.git`, `next.config.ts`, `app/`, `middleware.ts`, `lib/`, `vitest.config.ts`
- Migrate: `src/components/**` → `app/**` and `components/**`
- Modify: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`
- Keep: `google stich design/**` (reference), `src/index.css` → `app/globals.css`

- [ ] **Step 1: Initialise git and commit the current prototype as baseline**

Run:
```bash
cd "D:/kids-area/opsvale-pizzabox"
git init
printf "node_modules\ndist\n.next\n.env\n.env.local\n*.log\n" > .gitignore
git add -A && git commit -m "chore: baseline Stitch/AI-Studio prototype before Next.js migration"
```
Expected: a first commit containing the existing `src/` and reference designs.

- [ ] **Step 2: Create a migration branch**

Run: `git checkout -b feat/nextjs-foundation`
Expected: switched to new branch.

- [ ] **Step 3: Install Next.js and supporting deps; remove Vite-only deps**

Run:
```bash
npm install next@15 react@19 react-dom@19 zod
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
npm uninstall @vitejs/plugin-react vite @tailwindcss/vite @google/genai express dotenv @types/express
```
Note: keep `tailwindcss`, `lucide-react`, `motion`, `typescript`, `@types/node`.
Expected: `next` present in `package.json` dependencies.

- [ ] **Step 4: Replace scripts in `package.json`**

```json
"scripts": {
  "dev": "next dev -p 3000",
  "build": "next build",
  "start": "next start -p 3000",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run"
}
```

- [ ] **Step 5: Create `next.config.ts` with standalone output (for Docker) and Tailwind v4 via PostCSS**

```ts
// next.config.ts
import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
};
export default nextConfig;
```
Also create `postcss.config.mjs`:
```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```
Run: `npm install -D @tailwindcss/postcss`

- [ ] **Step 6: Move global styles**

Run: `mkdir -p app && git mv src/index.css app/globals.css`
Keep the existing `@import "tailwindcss";` and all custom classes (industrial-grid, font utilities) intact.

- [ ] **Step 7: Create the root layout importing globals + fonts**

```tsx
// app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
export const metadata = { title: 'OpsVale — Wholesale Pizza Box Sourcing & Operations' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#f8f9ff] text-[#0b1c30] antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Port shared UI components (no logic change) into `components/`**

Run: `mkdir -p components components/admin`
Move presentational components, adding `'use client'` at the top of any that use hooks/handlers:
```bash
git mv src/components/TopNavBar.tsx components/TopNavBar.tsx
git mv src/components/Footer.tsx components/Footer.tsx
git mv src/components/HeroSection.tsx components/HeroSection.tsx
git mv src/components/PillarsSection.tsx components/PillarsSection.tsx
git mv src/components/CalculatorPromoSection.tsx components/CalculatorPromoSection.tsx
git mv src/components/ProductsPage.tsx components/ProductsPage.tsx
git mv src/components/HowItWorksPage.tsx components/HowItWorksPage.tsx
git mv src/components/AboutPage.tsx components/AboutPage.tsx
git mv src/components/SavingsCalculatorPage.tsx components/SavingsCalculatorPage.tsx
git mv src/components/MultiStepQuotePage.tsx components/MultiStepQuotePage.tsx
git mv src/components/admin/*.tsx components/admin/
git mv src/types.ts lib/types.ts
```
Fix import paths (`../types` → `@/lib/types`) and add `'use client';` to each moved component that uses `useState`/event handlers. Configure `@/*` alias in `tsconfig.json` to point at project root.

- [ ] **Step 9: Create public route pages that render the ported components**

Create `app/(marketing)/page.tsx` (home = Hero + Pillars + CalculatorPromo), `app/(marketing)/products/page.tsx`, `app/(marketing)/how-it-works/page.tsx`, `app/(marketing)/about/page.tsx`, `app/calculator/page.tsx`, `app/quote/page.tsx`, plus `app/(marketing)/layout.tsx` wrapping children in `<TopNavBar/>` + `<Footer/>`. Replace the old `onNavigate` view-switching with Next `<Link>`/`useRouter`. (Locale segment added in Phase 6 — for now these live directly under `app/`.)

- [ ] **Step 10: Create the admin shell (unprotected for now, guarded in Phase 1)**

Create `app/admin/layout.tsx` (SideNav + main), and pages `app/admin/dashboard/page.tsx`, `leads/page.tsx`, `leads/[id]/page.tsx`, `quotes/page.tsx`, `pricing/page.tsx`, `logistics/page.tsx`, `settings/page.tsx` rendering the ported admin components with `mockData` still as their source (DB wired in Phase 1+).

- [ ] **Step 11: Delete the old SPA entrypoints**

Run: `git rm src/App.tsx src/main.tsx index.html vite.config.ts`
Keep `src/data/mockData.ts` temporarily (move to `lib/mockData.ts`): `git mv src/data/mockData.ts lib/mockData.ts` and fix imports.

- [ ] **Step 12: Verify build and dev server**

Run: `npm run typecheck && npm run build`
Expected: build succeeds, all routes compile. Then `npm run dev` and confirm `/`, `/calculator`, `/quote`, `/admin/dashboard` render matching the Stitch screenshots.

- [ ] **Step 13: Commit**

```bash
git add -A && git commit -m "feat: migrate prototype to Next.js App Router with public/admin route split"
```

---

## PHASE 1 — Database + auth boundary

**Files:**
- Create: `prisma/schema.prisma` (§2 above), `prisma/seed.ts`, `lib/db.ts`, `lib/auth.ts`, `middleware.ts`, `app/admin/login/page.tsx`, `app/api/auth/[...nextauth]/route.ts`
- Modify: `app/admin/layout.tsx` (read session), `.env.example`, `package.json`
- Test: `lib/__tests__/auth.test.ts`

- [ ] **Step 1: Install DB + auth deps**

Run: `npm install prisma @prisma/client next-auth@beta bcryptjs && npm install -D @types/bcryptjs tsx`

- [ ] **Step 2: Add the Prisma schema**

Create `prisma/schema.prisma` with the exact model from §2. Add to `.env.example`:
```
DATABASE_URL="postgresql://opsvale:opsvale@localhost:5432/opsvale?schema=public"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
```

- [ ] **Step 3: Start a local Postgres for development**

Run: `docker run --name opsvale-pg -e POSTGRES_USER=opsvale -e POSTGRES_PASSWORD=opsvale -e POSTGRES_DB=opsvale -p 5432:5432 -d postgres:16`
Expected: container running (`docker ps` shows opsvale-pg).

- [ ] **Step 4: Create migration + client**

Run: `npx prisma migrate dev --name init && npx prisma generate`
Expected: `prisma/migrations/*_init/` created, all tables exist.

- [ ] **Step 5: Prisma singleton**

```ts
// lib/db.ts
import { PrismaClient } from '@prisma/client';
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.prisma = prisma;
```

- [ ] **Step 6: Write failing test for password verification helper**

```ts
// lib/__tests__/auth.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../auth';
describe('password', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const h = await hashPassword('s3cret!');
    expect(await verifyPassword('s3cret!', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `hashPassword`/`verifyPassword` not exported.

- [ ] **Step 8: Implement auth helpers + Auth.js config**

```ts
// lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(c) {
        const user = await prisma.adminUser.findUnique({ where: { email: String(c?.email) } });
        if (!user || !user.active) return null;
        if (!(await verifyPassword(String(c?.password), user.passwordHash))) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 10: Wire the Auth.js route handler + middleware guard**

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```
```ts
// middleware.ts
import { auth } from '@/lib/auth';
export default auth((req) => {
  const isAdmin = req.nextUrl.pathname.startsWith('/admin');
  const isLogin = req.nextUrl.pathname.startsWith('/admin/login');
  if (isAdmin && !isLogin && !req.auth) {
    return Response.redirect(new URL('/admin/login', req.nextUrl));
  }
});
export const config = { matcher: ['/admin/:path*'] };
```

- [ ] **Step 11: Build the login page (Stitch-styled) posting to `signIn`**

Create `app/admin/login/page.tsx` — a client form calling `signIn('credentials', { email, password, redirectTo: '/admin/dashboard' })`, styled with the industrial design tokens (48px inputs, navy primary, JetBrains Mono labels per DESIGN.md).

- [ ] **Step 12: Seed the single admin + reference countries**

```ts
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/auth';
const prisma = new PrismaClient();
async function main() {
  await prisma.adminUser.upsert({
    where: { email: 'admin@opsvale.com' },
    update: {},
    create: { email: 'admin@opsvale.com', name: 'OpsVale Admin', passwordHash: await hashPassword('ChangeMe!2026'), role: 'SUPER_ADMIN' },
  });
  for (const c of [['DE','Germany'],['FR','France'],['IT','Italy'],['ES','Spain'],['NL','Netherlands']]) {
    await prisma.country.upsert({ where: { code: c[0] }, update: {}, create: { code: c[0], name: c[1] } });
  }
}
main().finally(() => prisma.$disconnect());
```
Add `"prisma": { "seed": "tsx prisma/seed.ts" }` to `package.json`. Run: `npx prisma db seed`.

- [ ] **Step 13: Verify the guard end-to-end**

Run: `npm run dev`. Visit `/admin/dashboard` while logged out → redirected to `/admin/login`. Log in with the seeded credentials → reach the dashboard. Log out → guard re-applies.

- [ ] **Step 14: Commit**

```bash
git add -A && git commit -m "feat: add Postgres+Prisma schema, Auth.js admin login, and /admin route guard"
```

---

## PHASE 2 — Pricing engine + calculator API (own plan)

Scope to expand into its own plan:
- `lib/pricing/resolveMarkup.ts` — resolve Global→Country→Product hierarchy (spec §29), unit-tested against the spec example (Global 25%, DE 30%, DE+12in-white-printed 35% ⇒ 35%).
- `lib/pricing/landedCost.ts` — assemble landed cost from components or use manual override (spec §27); `sellingRange = landed × (1+markupMin) … landed × (1+markupMax)` clamped to 15–45% (spec §28).
- `lib/pricing/publicRange.ts` — return approved `PublicPriceRange` (manual override wins), else compute; **never returns landed cost/markup** (spec §30, §47).
- `lib/calculator/savings.ts` — savingsPerBox, savings %, annual volume ×12, yearly savings, min/max variants (spec §9). Unit tests for each formula.
- `app/api/calculator/route.ts` — POST validated inputs → returns public range + savings only; missing-data path returns the "request an exact quote" payload (spec §10). Rate-limited.
- Rewrite `components/SavingsCalculatorPage.tsx` to call the API, keep-editable-inputs + auto-recalc after first calculate (spec §7), expandable breakdown + disclaimer (spec §8).
- Persist an anonymous `CalculatorSnapshot`-shaped session only on quote submission (spec §35 "avoid storing PII before consent").

## PHASE 3 — Quote flow persistence + files + email (own plan)

- Zod schemas for the 3-step quote (company / specs / delivery), server action to upsert Company+Contact+Lead+QuoteRequest+CalculatorSnapshot, generate `code` (OPS-YYYY-####).
- MinIO presigned upload endpoint `app/api/files/presign/route.ts`; client uploads photo/dieline/artwork directly; persist `StoredFile` rows (spec §11 file types, §42 secure uploads).
- `lib/email/notifyNewQuote.ts` via Nodemailer/Hostinger SMTP → admin notification (spec §40); DB remains source of truth.
- Post-submission confirmation screen echoing submitted requirements + "24 business hours" (spec §12).
- Carry calculator data forward into the quote (spec §11 pre-fill).

## PHASE 4 — CRM + quotes + activity (own plan)

- Replace `mockData` in admin with Prisma queries. Correct the pipeline enum everywhere to `New→Reviewing→Need More Information→Quote Prepared→Quote Sent→Negotiating→Won→Lost` (spec §22, §47).
- Lead detail: profile (company/contact/calculator/quote-request data), status update writes `LeadActivity`, notes, files list (spec §23–24).
- Quote records: create/revise quotes linked to lead, immutable revision history, statuses (spec §25–26). System does NOT auto-send.
- Dashboard action items + KPIs from DB (spec §36).

## PHASE 5 — Pricing/landed-cost/logistics admin + Excel (own plan)

- Manual editors for `PricingRule`, `LandedCost`, `PublicPriceRange`, `LogisticsCost` with Zod validation (positive, 15–45% markup bounds).
- Excel **update existing**: server-generated current-pricing sheet download → upload → validate structure/columns/formats/protected fields → diff (`24 updated / 0 new / 3 invalid`) → preview → confirm-apply (spec §32). `lib/excel/*` with `xlsx` + Zod; transactional apply.
- Excel **add new**: separate action + separate template + validate/preview/confirm (spec §33). Keep the two actions clearly distinct.
- Rule-resolution explainer UI ("which rule applies") (spec §29).

## PHASE 6 — i18n + legal/consent (own plan)

- Install `next-intl`; introduce `app/[locale]/` segment for public routes (admin stays English). Message catalogs `messages/{en,de,fr,it,es}.json` for nav, content, forms, validation, calculator, results.
- Language selector in `TopNavBar` (EN/DE/FR/IT/ES) with no forced auto-redirect (spec §4); currency stays EUR regardless of locale (spec §4).
- Legal pages: Privacy, Cookie, Terms, Company info, Copyright (spec §19); cookie-consent banner + privacy handling (spec §43).

## PHASE 7 — Analytics + hardening + VPS deploy (own plan)

- Analytics from DB: leads by country, market performance, quote activity over time, pipeline distribution, conversion rate, pipeline value (spec §36).
- Security pass: rate limiting on public POSTs, CSRF where applicable, input sanitisation, file-type/size enforcement, verify no landed cost/markup reachable from any public API (spec §42). Run the `security-review` skill.
- **Docker Compose deploy to Hostinger VPS:** services `web` (Next.js standalone), `db` (postgres:16 + volume), `minio` (+ volume), `nginx` (TLS via Let's Encrypt/Certbot, reverse proxy to `web`). `.env` on the VPS holds secrets. `docker compose up -d`; run `prisma migrate deploy` on release. Document backup of the Postgres volume.

---

## Deployment target (Hostinger VPS) — reference

```yaml
# docker-compose.yml (built in Phase 7; noted here so earlier phases stay compatible)
services:
  web:   { build: ., env_file: .env, depends_on: [db, minio], restart: always }   # next start, output: standalone
  db:    { image: postgres:16, env_file: .env, volumes: ["pgdata:/var/lib/postgresql/data"], restart: always }
  minio: { image: minio/minio, command: server /data --console-address ":9001", volumes: ["minio:/data"], restart: always }
  nginx: { image: nginx, ports: ["80:80","443:443"], volumes: [...certs, conf], depends_on: [web], restart: always }
volumes: { pgdata: {}, minio: {} }
```
Constraints this imposes on earlier phases: `next.config.ts` uses `output: 'standalone'` (Phase 0 Step 5); file storage uses S3 API against MinIO (not a cloud-specific SDK); email uses generic SMTP (Hostinger) not a proprietary API.

---

## Self-Review — spec coverage matrix

| Spec area | Phase |
|---|---|
| §3–5 Public pages, nav, hero | 0 (UI) / 6 (i18n) |
| §6–10 Calculator inputs, UX, results, formulas, missing-data | 2 |
| §11–12 Quote flow, files, post-submission | 3 |
| §13–15 Products / How It Works / About | 0 |
| §16–18 Trust, claims, contact | 0/3 |
| §19 Legal/footer | 6 |
| §20–26 Admin platform, CRM, lead profile, activity, quotes | 4 |
| §27–30 Pricing engine, markup, hierarchy, public range | 2/5 |
| §31–33 Pricing data mgmt + Excel update/add | 5 |
| §34 Logistics | 5 |
| §35 Database schema | 1 |
| §36–37 Dashboard, admin nav | 0 (shell) / 4 / 7 |
| §38 CTA strategy | 0 |
| §39 No customer accounts (schema future-proofed) | 1 |
| §40 Email notifications | 3 |
| §41 Validation | 2–5 (per feature) |
| §42–43 Security, privacy | 1 (auth) / 7 (hardening) / 6 (privacy) |
| §44–45 Performance, responsive | all (SSR + Tailwind) |
| §21 Single admin, role-ready | 1 (Role enum) |

**Gaps intentionally deferred (not dropped):** customer portal (spec §39 — schema only, no build), verified testimonials/case studies (spec §16 — content architecture allows, not built at launch).

---

## Execution Handoff

Phase 0 and Phase 1 are ready to execute now. Phases 2–7 each need their own detailed plan written (via writing-plans) immediately before starting them.
