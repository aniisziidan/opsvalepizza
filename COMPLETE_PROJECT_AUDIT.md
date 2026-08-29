# OpsVale Complete Project Audit

> **Mode:** Read-only forensic audit. No application code, configuration, schema, or dependency was modified. The only file created is this report.
> **Audit date:** 2026-08-28
> **Auditor role:** Principal Architect / Security Engineer / QA Director / DevOps / Technical Auditor
> **Primary source of truth:** the source code. Documentation was treated as a *claim* to be verified.
> **Verification performed this session:** `vitest run` → **156 tests / 39 files passing** (exit 0); `next build` → **succeeds** (exit 0, standalone output). Route table, schema, middleware, and every major module were read end-to-end.

---

## 1. Executive Summary

OpsVale is a **Next.js 15 / React 19 / Prisma 6 / PostgreSQL** monorepo that implements a multilingual public acquisition website **and** a secure internal B2B operations platform for wholesale pizza-box procurement. The build is green, the test suite (156 tests) passes, and the implementation has advanced **far beyond the documented "Phases 0–2 complete" state** — in reality it covers all seven planned phases plus a Phase 8 (notifications) and Phase 9 (visitor analytics) that were never in the original master plan.

**Overall the codebase is materially better than the originally scoped project.** The core commercial engine (pricing hierarchy, landed-cost → public-range with strict server-only isolation, quote revisioning with optimistic concurrency, transactional-outbox quote dispatch, immutable proposal snapshots, Excel bulk workflow with version-conflict detection) is genuinely well-engineered, transactionally safe, and unit-tested against real behavior.

**However, "green build + passing tests" is not "production ready."** The audit found concrete gaps between what is *documented*, what is *built*, what is *wired*, and what is *operationally safe*:

- **Deployment integrity risk (P0):** `deploy.sh` applies schema with `prisma db push --accept-data-loss` even though real migrations exist and `DEPLOYMENT.md` says to use `prisma migrate deploy`. This can silently drop production data.
- **Reverse proxy not in the prod stack (P0):** `docs/VPS_DEPLOYMENT_GUIDE.md` describes a 3-container stack including `opsvale-caddy`, but `docker-compose.prod.yml` contains **only** `app` + `postgres`. The `Caddyfile` exists but is not referenced by any compose file → no TLS termination in the shipped stack.
- **GDPR analytics consent is client-side only (P1):** the `/api/analytics/collect` endpoint ingests events with **no server-side consent check**; a persistent anonymous ID is stored. Retention pruning (`pruneExpiredAnalyticsData`) exists but is **never invoked by any cron/route**.
- **Weak CSP (P1):** production CSP correctly drops `unsafe-eval` but **retains `script-src 'unsafe-inline'`**, so the CSP does not meaningfully defend against injected inline scripts.
- **Rate limiting is in-memory and duplicated (P1):** two competing implementations (`lib/ratelimit` vs `lib/security`) with inconsistent proxy-trust behavior; both reset on restart and don't work across multiple instances.
- **Legal claims risk (P1):** `lib/legal/config.ts` hard-codes a specific KvK number, VAT ID, address and phone as "official verified corporate entity details," and defaults food-grade / EU-storage evidence flags to **true**.
- **SEO gap (P2):** `robots.ts` advertises `/sitemap.xml`, but **no `sitemap.ts` exists** (404), and its allow-list uses non-localized paths that only exist as redirect stubs.

**Verdict:** 🟡 **Functional and impressively complete, but requires hardening before production** — primarily around deployment safety, TLS/proxy wiring, consent/GDPR enforcement, and CSP.

---

## 2. Audit Scope and Methodology

**Inspected:** every file under `app/`, `components/`, `lib/`, `prisma/`; all root configs (`next.config.ts`, `middleware.ts`, `auth.config.ts`, `tsconfig.json`, `vitest.config.ts`, `Dockerfile`, `docker-compose*.yml`, `Caddyfile`, `deploy*.sh/ps1`, `.env.example`); all documentation (`README.md`, `DEPLOYMENT.md`, `docs/VPS_DEPLOYMENT_GUIDE.md`, `docs/superpowers/plans/*`).

**Method:**
1. Full repository inventory (182 `.ts/.tsx` source files, 39 test files).
2. End-to-end trace of each critical feature: **UI → client logic → server action/route → validation → authorization → business logic → DB → tests.**
3. Ran the test suite and a production build to distinguish *code exists* from *feature works* from *feature is tested* from *production ready*.
4. Compared each finding against the requirements captured in `docs/superpowers/plans/2026-08-25-opsvale-master-plan.md` (the closest artifact to the "desired OpsVale platform") and the domain checklist supplied in the audit brief.

**Limitation:** No live database or deployed environment was available, so runtime behavior (actual PDF byte output, live SMTP/Resend delivery, real geo headers behind Caddy) is inferred from code + tests, not observed in production. These are flagged as ⚫ where relevant.

---

## 3. Repository Inventory

**Top level:** `app/`, `components/`, `lib/`, `prisma/`, `public/` (incl. `sw.js` service worker, `images/`, `videos/`), `docs/`, `assets/`, `google stich design/` (reference HTML/PNG mockups), `tests/` (Playwright), `scratch/` (empty), `scripts/` (empty).

**Config/infra:** `next.config.ts`, `middleware.ts`, `auth.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `Dockerfile`, `docker-compose.yml` (dev postgres only), `docker-compose.prod.yml` (app+postgres), `Caddyfile`, `deploy.sh`, `deploy-remote.sh/.ps1`, `.env`, `.env.example`.

**Routes (from `next build` output):**
- Localized public (SSG, `generateStaticParams`): `/[locale]` + `about`, `calculator`, `cookies`, `how-it-works`, `imprint`, `privacy`, `products`, `quote`, `terms` × 5 locales.
- Legacy non-localized **redirect stubs** (static): `/about`, `/products`, `/how-it-works`, `/calculator`, `/quote`, `/` (see §29 — redundant).
- Admin (dynamic, guarded): `dashboard`, `leads`, `leads/[id]`, `quotes`, `pricing`, `logistics`, `notifications`, `visitors`, `analytics`, `settings`, `login`.
- Proposal portal (dynamic): `/proposals/[token]`.
- API: `auth/[...nextauth]`, `calculator`, `files/upload`, `health`, `cron/cleanup-uploads`, `analytics/collect`, `proposals/[token]/pdf`, `admin/files/[id]`, `admin/quotes/[id]/pdf`, `admin/pricing/excel/export`, `admin/analytics/export`, `admin/notifications/unread-count`, `admin/push/vapid-key`.
- `robots.txt` generated by `app/robots.ts`. **No `sitemap.ts`.**

**`lib/` domains:** `pricing/`, `calculator/`, `validation/`, `excel/`, `leads/`, `companies/`, `email/`, `notifications/`, `analytics/`, `consent/`, `legal/`, `i18n/`, `admin/`, `pdf/`, `storage/`, `ratelimit/`, `security/`, plus `auth.ts`, `db.ts`, `catalog.ts`, `types.ts`.

---

## 4. Complete Feature Catalog

| ID | Feature / Module | Description | Main files | Status |
|---|---|---|---|---|
| F-001 | Markup hierarchy resolver | GLOBAL→COUNTRY→PRODUCT resolution, clamped 15–45% | `lib/pricing/resolveMarkup.ts` | 🟢 Implemented + tested |
| F-002 | Selling range | `landed×(1+min)…landed×(1+max)` | `lib/pricing/sellingRange.ts` | 🟢 |
| F-003 | Public range resolution | Approved override wins, else compute; never leaks cost/markup | `lib/pricing/publicRange.ts` | 🟢 |
| F-004 | Savings formulas | per-box/pct/annual min-max | `lib/calculator/savings.ts` | 🟢 |
| F-005 | Public calculator response shaper | Guarantees no internal figures in payload | `lib/calculator/buildCalculatorResponse.ts` | 🟢 (security by design) |
| F-006 | Calculator API | Validate→lookup→range→savings, rate-limited | `app/api/calculator/route.ts` | 🟢 |
| F-007 | Quote submission flow | Idempotency, honeypot, anti-timing, atomic Company/Contact/Lead/QuoteRequest/Snapshot/Files | `app/quote/actions.ts` | 🟢 |
| F-008 | File upload (temp) | Magic-byte validation, 25 MB, 24h TTL token | `app/api/files/upload/route.ts`, `lib/validation/fileUpload.ts` | 🟢 |
| F-009 | Storage adapter | Local disk + S3/R2/MinIO, fail-fast config | `lib/storage/index.ts` | 🟢 |
| F-010 | Lead code sequence | `OPS-YYYY-####` via `LeadSequence` | `lib/leads/generateLeadCode.ts` | 🟢 |
| F-011 | Company match/create | Domain + normalized-name matching | `lib/companies/matchOrCreateCompany.ts` | 🟢 |
| F-012 | Quote revisioning | Concurrency retry on P2002, supersede drafts | `app/admin/leads/[id]/quote-actions.ts` | 🟢 |
| F-013 | Quote dispatch (outbox) | DRAFT→DISPATCHING atomic, snapshot freeze, bearer token, transactional outbox | same | 🟢 |
| F-014 | Proposal portal | Token lookup, accept/decline/modify, replay protection, expiry, legal-version capture | `app/proposals/[token]/*` | 🟢 |
| F-015 | Proposal PDF | pdfkit vector, localized, snapshot-driven, watermark/status banners | `lib/pdf/generateProposalPdf.ts` | 🟢 |
| F-016 | Excel workbook gen | Template with stable Record IDs | `lib/excel/generateWorkbook.ts` | 🟢 |
| F-017 | Excel parse+validate | Structure/format/protected-field validation | `lib/excel/parseWorkbook.ts`, `validation.ts` | 🟢 |
| F-018 | Excel diff engine | UPDATE_EXISTING / ADD_NEW / AUTO, version-conflict + duplicate detection | `lib/excel/diffEngine.ts` | 🟢 Exceeds |
| F-019 | Excel transactional commit | Versioned retire+create, audit log per change | `app/admin/pricing/excel-actions.ts` | 🟢 |
| F-020 | Logistics CRUD | Countries/ports/corridors/freight/inland/other | `app/admin/logistics/*`, `LogisticsCost` | 🟢 |
| F-021 | CRM leads list/detail | Pipeline, notes, activities, files | `app/admin/leads/*`, `components/admin/*` | 🟢 |
| F-022 | Admin user governance | Create/role/activate/reset, self-disable & last-super-admin protection, audit log | `app/admin/settings/actions.ts` | 🟢 |
| F-023 | Auth (credentials) | Auth.js JWT, bcrypt-12, timing-equalized dummy hash | `lib/auth.ts`, `auth.config.ts` | 🟢 |
| F-024 | Admin RBAC guard | `requireAdmin` / `requireSuperAdmin` w/ active check | `lib/admin/requireAdmin.ts` | 🟢 |
| F-025 | Middleware guard + locale | Gates `/admin/**`, locale detect/redirect | `middleware.ts` | 🟢 (see §18 gap) |
| F-026 | Notification dispatcher | In-app + web-push + email, prefs, incident dedup | `lib/notifications/dispatcher.ts` | 🟢 Exceeds |
| F-027 | Web push (VAPID) | Subscriptions, service worker, vapid-key API | `lib/notifications/webPush.ts`, `public/sw.js` | 🟢 |
| F-028 | Email dispatch | Resend API / SMTP / console fallback | `lib/email/transporter.ts`, `outbox.ts` | 🟢 |
| F-029 | Visitor analytics ingestion | Bot filter, geo, sessions (30-min), events | `lib/analytics/ingestion.ts` | 🟠 (consent server-side gap) |
| F-030 | Analytics dashboard + export | Traffic/CTA/funnel + CSV/JSON | `app/admin/analytics/*`, `lib/analytics/queries.ts`, `export.ts` | 🟢 |
| F-031 | Cookie consent | Banner, categories, versioning, withdrawal | `components/CookieConsentBanner.tsx`, `lib/consent/*` | 🟢 |
| F-032 | Legal pages + config | Privacy/cookies/terms/imprint + evidence flags | `app/[locale]/{privacy,cookies,terms,imprint}`, `lib/legal/config.ts` | 🟠 (claims risk) |
| F-033 | i18n (custom) | 5 locales, deep parity test, hreflang/canonical | `lib/i18n/*` | 🟢 |
| F-034 | Security headers | CSP/HSTS/XFO/nosniff/referrer/permissions | `next.config.ts` | 🟠 (unsafe-inline) |
| F-035 | Health probe | DB + storage, incident emit | `app/api/health/route.ts` | 🟢 |
| F-036 | Cron cleanup | Orphan upload GC, bearer-secured | `app/api/cron/cleanup-uploads/route.ts`, `lib/storage/cleanup.ts` | 🟢 |
| F-037 | Analytics retention prune | GDPR TTL purge | `lib/analytics/retention.ts` | 🔴 Exists but **unwired** |
| F-038 | Error boundaries | public/global/admin w/ digest IDs | `app/error.tsx`, `global-error.tsx`, `admin/error.tsx` | 🟢 |
| F-039 | Pricing audit log | CREATE/VERSION_UPDATE/TOGGLE/RETIRE | `PricingAuditLog` + excel/manual actions | 🟢 |
| F-040 | Admin audit log | Admin lifecycle events | `AdminAuditLog` + settings actions | 🟢 |

---

## 5. Architecture Overview

- **Single Next.js App Router codebase**, split by route group: localized public site under `app/[locale]/**`, English-only admin under `app/admin/**`, customer proposal portal at `app/proposals/[token]`, API route handlers under `app/api/**`.
- **Framework-agnostic business layer** in `lib/**`, unit-tested in isolation (pricing, calculator, excel, validation are DB-free and pure where possible).
- **Strict server-only pricing isolation:** `lib/pricing/**` is imported only by server actions / route handlers; the public calculator payload is shaped by `buildCalculatorResponse` which structurally cannot include landed cost or markup (enforced by a DB-free unit test). Verified by grep: `app/api/calculator/route.ts` references cost/markup only when mapping inputs into `resolvePublicRange`, never in the response.
- **PostgreSQL + Prisma** single source of truth; standalone output for Docker.
- **Edge-safe auth split:** `auth.config.ts` (no Prisma, Edge-safe, used by middleware) vs `lib/auth.ts` (Credentials provider + Prisma, Node runtime). Correct pattern.
- **Notable divergence from plan:** i18n is a **bespoke dictionary system** (`lib/i18n`), not the `next-intl` the plan/README named. This is arguably better (no dependency, typed dictionaries, deep parity test) but the docs were never updated.

---

## 6. Public Website & Acquisition Features

**Status:** 🟢 Fully implemented (localized).

**Evidence:** `app/[locale]/page.tsx` (Hero + Pillars + CalculatorPromo), `products`, `how-it-works`, `about`, `calculator`, `quote`; components `HeroSection`, `PillarsSection`, `CalculatorPromoSection`, `ProductsPage`, `HowItWorksPage`, `AboutPage`, `SavingsCalculatorPage`, `MultiStepQuotePage`, `TopNavBar`, `Footer`. Layout `app/[locale]/layout.tsx` wires nav/footer/consent banner/analytics provider and localized metadata.

**Acquisition flow:** calculator (server-driven) → carry state into multi-step quote (`app/quote/actions.ts`) with idempotency, honeypot (`_hp_company_fax_`), and sub-2s bot rejection. CTA strategy (request quote / calculate savings) present in dictionaries.

**Concern:** the calculator/quote CTAs and SEO allow-list still reference **non-localized** paths (`/calculator`, `/products`) that now only exist as redirect stubs (§21, §29).

---

## 7. Internationalization

**Status:** 🟢 Fully implemented (exceeds "planned next-intl" in rigor).

**Evidence:** `lib/i18n/config.ts` (LOCALES en/de/fr/it/es), `getDictionary.ts`, `context.tsx`, dictionaries `en|de|fr|it|es.ts` (**183 lines each — genuinely translated**, e.g. German `'Verbindliches Angebot anfordern'`). `middleware.ts` detects locale via `NEXT_LOCALE` cookie → `Accept-Language` → default; redirects non-locale public paths to a localized URL. `app/[locale]/layout.tsx` emits `alternates.canonical` + `languages` hreflang (`x-default` → en). PDF generation is locale-aware (`generateProposalPdf` → `getDictionary`).

**Parity test is genuine:** `lib/i18n/__tests__/dictionariesParity.test.ts` asserts 100% key coverage, zero orphan keys, matching value **types**, and preserved `{{interpolation}}` tokens for all four target locales — a real correctness test, not a smoke test.

**Minor:** currency stays EUR regardless of locale (correct per spec §4). Middleware performs an Accept-Language redirect for the bare `/`, which is a soft auto-redirect; language selector still allows manual override via cookie.

---

## 8. Pricing Engine

**Status:** 🟢🟢 Strong; **exceeds** requirements.

**Evidence & behavior:**
- `resolveMarkup` implements the exact GLOBAL→COUNTRY→PRODUCT precedence and clamps to `[0.15, 0.45]`; throws if no GLOBAL default. Matches spec §29 example.
- `sellingRange` computes min/max from landed × (1+markup), guards non-positive landed cost.
- `resolvePublicRange` returns approved override if present, else finds the qty tier and computes; returns `available:false` gracefully when no tier/rule — feeding the "request an exact quote" path (spec §10).
- Server-only: no pricing module imported by any client component (verified).
- Tests: `resolveMarkup.test.ts`, `sellingRange.test.ts`, `publicRange.test.ts`, `savings.test.ts`, `buildCalculatorResponse.test.ts` — all cover edge cases (clamping, missing rule, override precedence, no-leak).

**Verdict:** meets and exceeds — versioned `effectiveFrom/effectiveTo/active` on rules/costs/ranges adds temporal governance the original schema §2 lacked.

---

## 9. Bulk Excel Workflow

**Status:** 🟢🟢 Strong; **exceeds** requirements (one of the best-engineered subsystems).

**Evidence:** `lib/excel/generateWorkbook.ts` (template + stable Record IDs), `parseWorkbook.ts`, `validation.ts`, `diffEngine.ts`, and `app/admin/pricing/excel-actions.ts` (`previewExcelUpload`, `commitBulkPricingChanges`).

**Verified behaviors:**
- Explicit **UPDATE_EXISTING** vs **ADD_NEW** vs AUTO modes with distinct semantics (update-only rejects new rows; add-new rejects duplicates).
- **Stable Record IDs** + **version-conflict detection**: if a sheet references a `recordId` that has since been retired (`active=false`), the row is marked `CONFLICT` and blocks commit.
- **Duplicate detection** across landed costs / pricing rules / public ranges by natural key.
- **Transactional commit** (`prisma.$transaction`) with **versioned retire-then-create** (old record `active=false, effectiveTo=now`) and a `PricingAuditLog` row per change; optimistic concurrency re-check inside the transaction.
- `canCommit` requires zero errors AND zero conflicts AND at least one insert/update.
- Tests: `diffEngine.test.ts`, `importModesAndConflicts.test.ts`, `bulkCommit.integration.test.ts`, `parseAndValidateWorkbook.test.ts`, `generateWorkbook.test.ts`.

**Verdict:** exceeds the "download→edit→validate→preview→confirm" spec with real concurrency safety and audit history.

---

## 10. Logistics Management

**Status:** 🟢 Implemented.

**Evidence:** `LogisticsCost` model (country, route, port, shipMethod, freight/inland/other EUR, active), `app/admin/logistics/page.tsx`, `actions.ts`, `components/admin/LogisticsHubs.tsx`, and `app/admin/logistics/__tests__/logisticsValidation.test.ts`. CRUD + active/inactive + Zod validation present.

**Note:** logistics costs are **not** currently fed into the landed-cost computation (landed cost is stored directly, not assembled from freight+inland+other). This matches the schema's `LandedCost.costEur` manual/dynamic model, but the "assemble landed cost from logistics components" idea in plan §2 (spec §27) is **not** wired — landed cost is entered/imported directly. Minor scope reduction, not a defect.

---

## 11. CRM & Lead Management

**Status:** 🟢 Fully implemented.

**Evidence:** correct 8-state pipeline enum `NEW→REVIEWING→NEED_MORE_INFO→QUOTE_PREPARED→QUOTE_SENT→NEGOTIATING→WON→LOST` (matches the spec correction called out in plan §0). Lead codes via `LeadSequence` + `generateLeadCode` (`OPS-2026-####`, tested). `matchOrCreateCompany` dedups by normalized domain/name. `Lead.idempotencyKey` unique prevents double-submit. `LeadActivity` timeline with typed events (NOTE, STATUS_CHANGE, QUOTE_*, CUSTOMER_RESPONSE, SUBMISSION, EMAIL, SYSTEM). Admin UI: `AdminLeadsList`, `LeadDetailView`, `app/admin/leads/[id]/page.tsx`. Status changes and notes write activities and are authored (`authorId`).

---

## 12. Quote & Revision Management

**Status:** 🟢🟢 Strong.

**Evidence:** `app/admin/leads/[id]/quote-actions.ts`.
- `createQuote`: computes `nextRevision` inside a transaction, retries up to 3× on unique-constraint (`P2002`) conflicts (concurrency-safe against the `@@unique([leadId, revision])` index), supersedes prior **DRAFT** quotes only (leaves SENT proposals intact), advances lead to `QUOTE_PREPARED` on Rev 1, logs activity with author.
- `dispatchQuote`: idempotent; DRAFT→DISPATCHING via conditional `updateMany` (atomic state guard), **freezes an immutable JSON snapshot**, generates a 64-hex bearer `accessToken`, 30-day expiry, enqueues a **transactional-outbox** email, then triggers the processor; retries reuse the existing outbox row.
- Tests: `lib/pricing/__tests__/quoteRevision.test.ts`, `proposalLifecycle.test.ts`, `commercialLifecycle.integration.test.ts`.

**Verdict:** meets and exceeds spec §25–26 (system does not auto-send; admin explicitly dispatches; revision history immutable).

---

## 13. Proposal Portal

**Status:** 🟢🟢 Strong.

**Evidence:** `app/proposals/[token]/page.tsx` + `actions.ts`, `components/CustomerProposalView.tsx`.
- Token lookup rejects tokens `< 32` chars; renders from the **frozen snapshot**, not live data (immutability).
- `acceptProposal`: atomic `updateMany` gated on `status:'SENT'` AND `expiresAt > now` → **replay/expiry protection**; on zero rows it disambiguates (already accepted / superseded / rejected / expired). Advances lead to WON, records the accepted **Terms/Privacy version** in the activity log (legal evidence).
- `declineProposal` / `requestProposalModification` similarly guarded; emit notification events.
- Middleware cleanly rewrites `/[locale]/proposals/...` → `/proposals/...`.

**Minor:** `declineProposal`'s `updateMany` guards `status:'SENT'` but not `expiresAt` (an expired-but-still-SENT quote could be declined). Cosmetic, not a security issue.

---

## 14. PDF Generation

**Status:** 🟢 Implemented; the "vector-quality" claim is substantially accurate.

**Evidence:** `lib/pdf/generateProposalPdf.ts` uses **pdfkit** (vector primitives + Helvetica core fonts) to render a deterministic single A4 sheet: DRAFT watermark, status banners (SUPERSEDED/ACCEPTED/REJECTED/EXPIRED), corporate header, pricing block, spec/logistics/notes sections, footer with legal notice. Localized via `getDictionary`. Served by `app/api/proposals/[token]/pdf/route.ts` (`runtime='nodejs'`, `no-store`) and `app/api/admin/quotes/[id]/pdf/route.ts`. Tests: `pdfGeneration.test.ts`, `localizedPdf.test.ts`.

**Caveats (⚫/🟠):** monetary/date formatting is hard-coded to `en-GB`/`en-US` locales inside the PDF even when the document locale is de/fr/it/es (partial localization). Body copy uses only core Helvetica (no embedded Unicode font) — fine for Western-European text but would not render non-Latin glyphs.

---

## 15. Storage & File Management

**Status:** 🟢 Implemented (with an architectural note).

**Evidence:** `lib/storage/index.ts` provides `LocalDiskAdapter` and `S3StorageAdapter` (works with AWS S3 / Cloudflare R2 / MinIO via `S3_ENDPOINT`/`forcePathStyle`). `createStorageAdapter()` **fails fast** if `STORAGE_PROVIDER=s3` (or an `S3_BUCKET` is present) but required vars are missing — no silent degradation. Upload validation (`lib/validation/fileUpload.ts`) enforces extension allow-list + **magic-byte signature** (PDF/PNG/JPEG/PostScript) + ext↔signature match + 25 MB cap. Temp uploads (`TemporaryUpload`) get a 24h TTL and are atomically claimed (`updateMany status TEMPORARY→ATTACHED`, `count===1`) during quote submission — single-use, race-safe. Admin download (`app/api/admin/files/[id]/route.ts`) requires an authenticated session, sanitizes filename, sets `attachment` + `nosniff` + `private, no-store`.

**Architectural difference vs plan:** the plan called for **presigned direct-to-MinIO uploads**; the actual implementation **streams the file through the Next server** (`formData` → buffer → `storage.save`). Simpler and safer to validate, but the whole 25 MB body transits the app server and is buffered in memory. Acceptable at this scale; not what the plan described.

---

## 16. Notification System

**Status:** 🟢🟢 Strong; **greatly exceeds** the original "email admin on new quote" scope (this is an entire unplanned Phase 8).

**Evidence:** `lib/notifications/{dispatcher,events,queries,actions,webPush}.ts`. Schema: `Notification`, `NotificationPreference`, `PushSubscription`, `SystemIncident` + rich `NotificationType`/`Category`/`Priority` enums.
- Fan-out to all active admins (or a specific recipient), honoring per-category preferences (in-app / browser-push / email; email defaults on only for `CRITICAL`).
- **Web push** (RFC 8291/8292 VAPID) with `public/sw.js`, subscription pruning on 410/404, `lastUsedAt` tracking.
- **Incident deduplication**: `SystemIncident` with a 5-minute cooldown to prevent alert storms, plus `SYSTEM_RECOVERED` resolution.
- APIs: `/api/admin/notifications/unread-count`, `/api/admin/push/vapid-key`. UI: `AdminNotificationBell`, `NotificationsCenterView`.
- Tests: `notifications/__tests__/{actions,dispatcher}.test.ts`.

Emitted from real business paths: quote submission, proposal accept/decline/modify, pricing import, DB health failure/recovery.

---

## 17. Visitor Intelligence & Analytics (Phase 9)

**Status:** 🟠 Implemented but with a **GDPR-enforcement gap** and **unwired retention/anomaly** pieces.

**Implemented (evidence):** models `Visitor`, `VisitorSession`, `AnalyticsEvent` (+ rich indexes and enums). `lib/analytics/`: `ingestion.ts` (bot filter, 30-min session inactivity, visitor/session upsert, event create), `botDetector.ts`, `geoResolver.ts`, `sanitizer.ts`, `queries.ts`, `export.ts`, `tracker.ts`, `retention.ts`. Client: `components/analytics/VisitorAnalyticsProvider.tsx` gates on `getClientConsent().analytics`. API `app/api/analytics/collect/route.ts` (Zod, 60/min rate limit, 202 on filtered). Admin `app/admin/visitors/page.tsx` + `VisitorsIntelligenceView`. CSV/JSON export via `app/api/admin/analytics/export/route.ts`. **IP is never stored** (geo derived from CDN header only). Tests: `botDetector`, `consentGating`, `geoResolver`, `ingestion`, `queries`, `sanitizer`.

**Gaps:**
- 🟠 **Consent enforced client-side only.** `/api/analytics/collect` performs **no server-side consent verification** — any client (or a non-browser POST) can insert events with a persistent `anonymousId`. The `consentGating` test validates `isCategoryAllowed`, but that function is only called in the browser provider, not on the server. Under GDPR the persistent identifier requires consent that the server does not verify.
- 🔴 **Retention pruning unwired.** `pruneExpiredAnalyticsData()` exists in `lib/analytics/retention.ts` but grep confirms **no import anywhere** (no cron route, no scheduler). The only cron route is `cleanup-uploads`. Data retention is therefore not operational.
- 🟠 **Geo only works behind a CDN with `TRUST_PROXY=true`** (`cf-ipcountry`/`x-vercel-ip-country`/…). The shipped stack terminates at **Caddy**, which does **not** set those headers → all analytics `countryCode` will be null in the documented deployment. "Geo resolution / country data" is effectively non-functional on the target infra.
- ⚫ **Anomaly detection** notification types (`ANALYTICS_TRAFFIC_ANOMALY`, `ANALYTICS_CONVERSION_DROP`, `ANALYTICS_TRAFFIC_OPPORTUNITY`) exist in the schema/`events.ts` but no scheduled job emits them.

---

## 18. Authentication & User Governance

**Status:** 🟢 Strong, with one middleware-layer nuance.

**Evidence:** Auth.js v5 JWT sessions; `hashPassword`/`verifyPassword` bcrypt cost-12; a fixed `DUMMY_HASH` bcrypt compare on the no-user/inactive path to **equalize timing** and mitigate user enumeration. `requireAdmin`/`requireSuperAdmin` re-load the admin from DB and reject inactive accounts and insufficient roles. Governance (`app/admin/settings/actions.ts`) implements **self-demotion**, **self-disable**, and **last-active-SUPER_ADMIN** protections, plus `AdminAuditLog` entries for every lifecycle change; own-password change verifies the current password.

**Nuance (🟠):** the Edge middleware `authorized` callback only checks `!!auth?.user` (logged-in), **not** `active` or `role`. A user deactivated *after* issuing a JWT can still load admin **pages** until a server action/query calls `requireAdmin` (which does re-check `active`). Since all mutations go through `requireAdmin`, this is a defense-in-depth gap (stale read access to page shells), not a privilege-escalation hole. Recommend re-validating `active` in the JWT/session callback or shortening session lifetime.

---

## 19. Security Audit

| Control | State | Evidence / Note |
|---|---|---|
| CSP `unsafe-eval` | 🟢 removed in prod | `next.config.ts` (`isProd` branch) |
| CSP `unsafe-inline` (script) | 🟠 **retained in prod** | `script-src 'self' 'unsafe-inline'` — CSP does not block injected inline scripts |
| HSTS | 🟢 prod-only | `max-age=31536000; includeSubDomains` (no `preload`) |
| X-Frame-Options / frame-ancestors | 🟢 | `DENY` + `frame-ancestors 'none'` |
| MIME sniffing | 🟢 | `X-Content-Type-Options: nosniff` global + on file responses |
| Referrer / Permissions Policy | 🟢 | `strict-origin-when-cross-origin`; camera/mic/geo/payment disabled |
| X-Robots-Tag (non-prod) | 🟢 | `noindex,nofollow` when `APP_ENV!==production` |
| Rate limiting | 🟠 | **Two in-memory implementations** (`lib/ratelimit` used by calculator/upload/analytics; `lib/security` used by quote submit). In-memory → resets on restart, not multi-instance. Inconsistent proxy trust (below). |
| IP spoofing | 🟠 | `lib/ratelimit.getClientIp` trusts `x-forwarded-for` **unconditionally**; `lib/security.getClientIp` respects `TRUST_PROXY`. The public API limiter is spoofable. |
| Input validation | 🟢 | Zod on every mutation (calculator, quote, quotes, settings, excel, proposal actions, analytics) |
| File upload | 🟢 | magic-byte + ext match + size cap |
| AuthZ on mutations | 🟢 | `requireAdmin`/`requireSuperAdmin` on all admin actions; admin file/pdf routes check session |
| Pricing leak | 🟢 | server-only; response shaper structurally excludes cost/markup (unit-tested) |
| Token security | 🟢 | 64-hex bearer, unique-indexed, expiry, atomic replay guard |
| CSRF | 🟡 | No explicit tokens; relies on same-origin `form-action 'self'` + SameSite cookies + POST server actions. Acceptable for Next server actions; proposal actions are intentionally token-bearer (unauthenticated by design). |
| Secrets / error leaks | 🟢 | Secrets in `.env` (git-ignored); error boundaries expose only `digest` correlation IDs, not stack traces |
| Env validation | 🟡 | Storage config fails fast; `validateProductionLegalCompliance` exists but is **not enforced at boot** |
| CRON auth | 🟢 | Bearer `CRON_SECRET` compare (but **no-secret = open**, see below) |

**Additional:** `cleanup-uploads` cron only enforces the bearer **if `CRON_SECRET` is set**; if unset, the endpoint is unauthenticated. Prefer failing closed.

---

## 20. GDPR, Legal & Consent

**Status:** 🟠 Mostly present; two real risks.

**Implemented:** `CookieConsentBanner` + `lib/consent/{consentManager,types}.ts`: categories (necessary/analytics/marketing/preferences), **consent versioning** (outdated version → re-prompt), 1-year `SameSite=Lax` cookie, withdrawal via re-selection with a `opsvale_consent_updated` event. Legal pages exist (`privacy`, `cookies`, `terms`, `imprint`) per locale. Proposal acceptance records the **Terms/Privacy version** accepted (legal evidence).

**Risks:**
- 🟠 **Analytics consent not enforced server-side** (see §17).
- 🟠 **Unbacked corporate/certification claims.** `lib/legal/config.ts` hard-codes `OpsVale B.V.`, `KvK 88392019`, `NL883920190B01`, a Rotterdam address and phone as "official verified corporate entity details," and defaults `foodGradeEu1935_2004` and `euStorageOnly` evidence flags to **true** (`!== 'false'`). If these entity/registration/certification details are not genuinely verified, this is a legal/compliance liability. `validateProductionLegalCompliance` can flag missing env overrides but is not called during boot.

---

## 21. SEO & Search Protection

**Status:** 🟠 Good indexing controls, one broken reference.

**Evidence:** `app/robots.ts` — non-prod `disallow:'/'`; prod allows public paths and disallows `/admin/`, `/proposals/`, `/api/`; declares `sitemap: ${APP_URL}/sitemap.xml`. Localized `canonical` + `hreflang` in `app/[locale]/layout.tsx`. Per-locale metadata/OpenGraph via `generateMetadata`.

**Gaps:**
- 🔴 **No `sitemap.ts`** — the advertised `/sitemap.xml` returns 404.
- 🟠 The robots **allow-list uses non-localized paths** (`/calculator`, `/products`, `/how-it-works`, `/about`, `/quote`) which now only exist as 307 redirect stubs; canonical content lives under `/[locale]/…`.

---

## 22. Error Boundaries & Reliability

**Status:** 🟢 Implemented well.

**Evidence:** `app/error.tsx` (public), `app/global-error.tsx` (root), `app/admin/error.tsx` (admin). All are client boundaries that log only `error.digest || error.message`, surface a **digest correlation ID** to the user (no stack/PII leakage), and offer a `reset()` recovery action + navigation. Health probe emits CRITICAL `DATABASE_UNAVAILABLE` / `SYSTEM_RECOVERED` incidents.

---

## 23. Commercial Analytics

**Status:** 🟢 Implemented.

**Evidence:** `app/admin/analytics/page.tsx` + `components/admin/AnalyticsDashboard.tsx`; `lib/admin/analyticsQueries.ts` (+ `__tests__/analyticsQueries.test.ts`), `lib/admin/queries.ts`, `formatters.ts`. Export at `app/api/admin/analytics/export/route.ts` (CSV/JSON). Dashboard covers pipeline/conversion/financial/country/product metrics derived from DB (spec §36).

---

## 24. Infrastructure & Deployment

**Status:** 🟠 Works, but the shipped prod stack and scripts have real safety gaps.

**Evidence & findings:**
- `Dockerfile`: multi-stage, `node:20-alpine`, non-root `nextjs:nodejs`, standalone server, dedicated `uploads` dir. Good. (⚫ `DEPLOYMENT.md` prescribes `node:22` — mismatch.)
- `docker-compose.prod.yml`: **only `app` + `postgres`** (app bound to `127.0.0.1:3010`, uploads volume, healthchecked DB). **No Caddy/reverse-proxy service** despite `docs/VPS_DEPLOYMENT_GUIDE.md` describing an `opsvale-caddy` TLS container. The `Caddyfile` (which proxies `app:3000`) is **not referenced by any compose file** → as shipped, there is **no TLS termination and no reverse proxy** in the stack.
- 🔴 **`deploy.sh` runs `prisma db push --accept-data-loss`** to sync schema — bypassing the five real migrations in `prisma/migrations/` and contradicting `DEPLOYMENT.md`'s `prisma migrate deploy`. On an existing prod DB this can **drop columns/data** and diverges migration history.
- Health probe + retry loop in `deploy.sh`; image prune. Reasonable ops ergonomics.
- **No automated Postgres backup** script/job (plan §7 called for documenting volume backups).
- `TRUST_PROXY` defaults `false`; behind a proxy this must be set true (also affects geo + rate-limit IP).

---

## 25. Database Architecture

**Status:** 🟢🟢 Strong; **far exceeds** the plan's §2 schema.

**Evidence:** `prisma/schema.prisma` — 24+ models/enums. Highlights beyond plan: `PublicPriceRange` + temporal versioning (`effectiveFrom/To`, `active`), `PricingAuditLog`, `AdminAuditLog`, `Company` normalization fields + dedup indexes, `LeadSequence`, `TemporaryUpload` (single-use tokens), `Quote` lifecycle (`accessToken`, `snapshot`, `dispatchReqAt/sentAt/expiresAt/acceptedAt/rejectedAt`), `OutboxEmail` (transactional outbox), `Notification*` suite, `SystemIncident`, and the full Phase-9 analytics trio. Sensible unique constraints (`@@unique([leadId,revision])`, `sizeLabel_material_print`, `accessToken`, `idempotencyKey`, `endpoint`) and indexes throughout. Cascade deletes on notification/analytics children. Money as `Decimal(10,4)`; markup as `Decimal(4,3)`.

Five migrations present (`init`, `add_indexes`, `add_pricing_versioning_and_audit`, `add_outbox_quote_snapshot_and_lifecycle`, `add_admin_audit_log`) — but note the deploy script bypasses them (§24). ⚠️ The **analytics/notification models appear to have no corresponding migration** in the listed set (schema was extended, likely applied via `db push`), which is exactly why `deploy.sh` uses `db push`. This is a migration-history integrity problem.

---

## 26. API & Server Action Inventory

**Route handlers:** `calculator` (public, rate-limited), `files/upload` (public, validated, rate-limited), `analytics/collect` (public, rate-limited, **no consent check**), `health`, `cron/cleanup-uploads` (bearer), `proposals/[token]/pdf` (token), `admin/files/[id]` (auth), `admin/quotes/[id]/pdf` (auth), `admin/pricing/excel/export` (auth), `admin/analytics/export` (auth), `admin/notifications/unread-count` (auth), `admin/push/vapid-key`, `auth/[...nextauth]`.

**Server actions:** quote submit (`app/quote/actions.ts`); leads (`app/admin/leads/actions.ts`, `quote-actions.ts`); pricing (`app/admin/pricing/actions.ts`, `excel-actions.ts`); logistics (`app/admin/logistics/actions.ts`); settings/governance (`app/admin/settings/actions.ts`); proposal accept/decline/modify (`app/proposals/[token]/actions.ts`); notifications (`lib/notifications/actions.ts`). **All admin actions call `requireAdmin`/`requireSuperAdmin`; all validate with Zod.**

---

## 27. Testing & Verification Audit

**Observed:** `vitest run` → **39 files, 156 tests, all passing** (4.78s). `next build` → success.

**Genuine behavioral tests (exercise real code):** pricing (`resolveMarkup`, `sellingRange`, `publicRange`, `savings`, `buildCalculatorResponse`), excel (`diffEngine`, `importModesAndConflicts`, `bulkCommit.integration`, `parseAndValidateWorkbook`, `generateWorkbook`), i18n parity (deep, real), consent gating, validation (calculator/fileUpload/quoteRequest), rate limiter, storage adapter, leads code, company match, commercial lifecycle integration, proposal lifecycle, quote revision, PDF generation/localized, notifications, analytics ingestion/bot/geo/sanitizer/queries, legal config, formatters, health check.

**Weaknesses:**
- 🟠 `lib/admin/__tests__/adminGovernance.test.ts` tests a **`MockGovernanceEngine` reimplementation**, not the real `app/admin/settings/actions.ts`. The protections *are* implemented in the real code, but the test validates a parallel mock — so it proves the *logic design*, not the *shipped path*.
- Several "integration" tests inject in-memory context rather than hitting a real DB (e.g. diff engine accepts `injectedContext`), so DB-level constraints/transactions are only partly exercised.
- **Playwright** is configured (`playwright.config.ts`, `tests/`, `playwright-report/`) but no meaningful E2E coverage was found in-tree — true end-to-end (login, submit quote, dispatch, accept) is not demonstrably automated.

**Net:** strong unit/logic coverage; light true E2E and DB-integration coverage.

---

## 28. Documentation Accuracy Audit

| Document claim | Actual evidence | Status |
|---|---|---|
| README: "Planned: next-intl (i18n)" | Custom `lib/i18n` dictionary system; no `next-intl` dependency | ⚫ Outdated |
| README: "Phases 0–2 complete… remaining: …" | All phases + Phase 8 (notifications) + Phase 9 (analytics) implemented | ⚫ Outdated (understates) |
| Master plan: "24 tests… passing" | 156 tests passing | ⚫ Outdated |
| DEPLOYMENT.md: `node:22-alpine` | `Dockerfile` uses `node:20-alpine` | ⚫ Mismatch |
| DEPLOYMENT.md: "`npx prisma migrate deploy`" | `deploy.sh` uses `prisma db push --accept-data-loss` | 🔴 Contradiction (unsafe) |
| VPS guide: "3 containers incl. `opsvale-caddy` TLS proxy" | `docker-compose.prod.yml` has only app+postgres; Caddyfile unused | 🔴 Unsupported |
| DEPLOYMENT.md: robots disallows /admin,/proposals,/api | True in prod (`app/robots.ts`) | 🟢 Verified |
| DEPLOYMENT.md: "S3/R2/MinIO supported" | `S3StorageAdapter` present + fail-fast config | 🟢 Verified |
| DEPLOYMENT.md: Infra Diagnostics / DB latency in /admin/settings | `SettingsView` + `/api/health` exist | 🟢 Plausible (not runtime-verified) |
| DEPLOYMENT.md: proposal PDF "vector" download | pdfkit vector PDF route present | 🟢 Verified (with locale caveat §14) |
| README seeded creds `admin@opsvale.com / ChangeMe!2026` | Matches `prisma/seed.ts` (name "Sarah Jenkins") | 🟢 Verified |
| Legal config "official verified corporate entity details" | Hard-coded KvK/VAT/address defaults; no verification source | ⚫ Unverifiable claim |

---

## 29. Dead Code, Duplication & Technical Debt

**Critical:** none in application logic.

**High:**
- **Duplicate rate limiters** — `lib/ratelimit/rateLimiter.ts` vs `lib/security/rateLimiter.ts`; different interfaces (`success` vs `allowed`) and **inconsistent proxy trust**. `lib/security` carries a comment "Production will use Redis/Upstash (Phase 7)" that was never implemented. Consolidate to one, TRUST_PROXY-aware, and back it with a shared store.
- **Unwired GDPR retention** — `lib/analytics/retention.ts::pruneExpiredAnalyticsData` has zero importers.

**Medium:**
- **Redundant non-localized route stubs** — `app/(marketing)/{page,products,how-it-works,about}.tsx`, `app/calculator/page.tsx`, `app/quote/page.tsx`, and `app/page.tsx` are all `redirect()` shims to `/en/*`. `app/page.tsx` and `app/(marketing)/page.tsx` both target `/` (the build tolerates it, but it's redundant). Middleware already handles locale redirects, making most of these belt-and-suspenders duplication.
- **Anomaly-detection notification types** defined but never emitted (no scheduler).
- **Logistics components not fed into landed cost** (data captured but unused by pricing).

**Low / Informational:**
- No `TODO`/`FIXME`/`HACK`/`@ts-ignore`/`eslint-disable` found (clean).
- `scratch/` and `scripts/` directories are empty.
- Analytics/notification schema extensions lack dedicated migrations (applied via `db push`).

---

## 30. Requirements Reconciliation Matrix

| Requirement | Desired state | Actual state | Evidence | Rating | Verdict |
|---|---|---|---|---|---|
| Server-only pricing | No cost/markup to client | Enforced + unit-tested shaper | `buildCalculatorResponse.ts` | 🟢 | Better |
| Markup hierarchy | GLOBAL→COUNTRY→PRODUCT, 15–45% | Exact, clamped | `resolveMarkup.ts` | 🟢 | Meets |
| Calculator missing-data path | Return "request exact quote" | `available:false` reasons | `api/calculator/route.ts` | 🟢 | Meets |
| Quote persistence + files + email | Atomic write, upload, notify | Full + idempotency + honeypot | `app/quote/actions.ts` | 🟢 | Better |
| CRM pipeline enum | 8-state corrected | Implemented | `schema.prisma` LeadStatus | 🟢 | Meets |
| Quote revisions | Immutable, concurrency-safe | P2002 retry + supersede | `quote-actions.ts` | 🟢 | Better |
| Excel update/add | Two modes, diff, confirm | + version-conflict, transactional, audit | `diffEngine.ts`, `excel-actions.ts` | 🟢 | Better |
| Logistics | CRUD + validation | Present | `logistics/*` | 🟢 | Meets |
| i18n EN/DE/FR/IT/ES | Catalogs + selector | Custom, deep-parity tested | `lib/i18n/*` | 🟢 | Better |
| Legal/consent | Pages + cookie consent | Present + versioned | `consent/*`, legal pages | 🟡 | Partial (server enforce, claims) |
| Proposal portal | Secure token + immutable | Snapshot + replay guard | `proposals/[token]/*` | 🟢 | Better |
| PDF | Localized, accurate | pdfkit vector | `generateProposalPdf.ts` | 🟢 | Meets (locale caveat) |
| Notifications | Admin email on quote | Full multi-channel center | `notifications/*` | 🟢 | Exceeds |
| Analytics | Dashboard from DB | Present + Phase-9 visitor intel | `admin/analytics`, `analytics/*` | 🟢/🟠 | Exceeds build / partial GDPR |
| Consent-gated analytics | Block before consent | Client-side only | `api/analytics/collect` | 🟠 | Worse than intended |
| Data retention | Purge old data | Function exists, **unwired** | `retention.ts` | 🔴 | Missing (operationally) |
| Production CSP | No `unsafe-eval` | eval gone, **inline kept** | `next.config.ts` | 🟡 | Partial |
| Rate limiting | Public POST limits | In-memory, dup, spoofable | `ratelimit/`, `security/` | 🟠 | With risks |
| SEO robots/sitemap | robots + sitemap | robots ✔, **no sitemap** | `robots.ts` | 🟡 | Partial |
| Auth + RBAC + safeguards | Guard + protections | Implemented + audit | `requireAdmin`, `settings/actions.ts` | 🟢 | Better |
| Docker deploy + TLS | web+db+proxy on VPS | app+db only, **no proxy in stack** | `docker-compose.prod.yml` | 🟠 | Worse than documented |
| Safe migrations | `migrate deploy` | `db push --accept-data-loss` | `deploy.sh` | 🔴 | Risk |
| DB backups | Documented/automated | None | — | 🔴 | Missing |

---

## 31. Better vs Worse Than Desired Analysis

**Better than required:** pricing/excel/quote/proposal engines (concurrency, versioning, audit, immutable snapshots, transactional outbox); notification center (entire unplanned phase); analytics build breadth; DB schema depth; timing-safe auth; error-boundary hygiene; i18n parity rigor.

**Aligned:** public site, CRM, logistics, calculator, PDF, storage adapters, legal pages.

**Worse / riskier than intended:** deployment safety (`db push --accept-data-loss`; no proxy/TLS in the shipped stack; no backups); GDPR analytics (client-only consent, unwired retention, geo dead behind Caddy); CSP (`unsafe-inline`); rate limiting (in-memory, duplicated, spoofable); SEO (missing sitemap); legal claims (hard-coded/defaulted certifications).

**Over-engineered relative to a single-admin launch:** the full notification preference matrix, web-push, incident dedup, and anomaly enums add maintenance surface some of which (anomaly emission, retention) is not actually wired — complexity without full payoff.

---

## 32. Missing Features

- 🔴 **`sitemap.xml`** (referenced, not implemented).
- 🔴 **Wired analytics retention/purge** job (GDPR).
- 🔴 **Automated DB backup** procedure.
- 🔴 **Reverse proxy / TLS** service in `docker-compose.prod.yml` (Caddyfile exists but unused).
- 🟠 **Server-side consent enforcement** for analytics.
- 🟠 **Persistent/shared rate-limit store** (Redis) — planned, never built.
- ⚫ **Anomaly-detection scheduler** to emit the analytics alert types.
- ⚫ **True E2E test suite** (Playwright configured but effectively empty).

---

## 33. Features That Exceed Requirements

- Transactional-outbox quote dispatch with immutable snapshot + bearer proposal portal + replay/expiry protection.
- Excel bulk workflow with stable Record IDs, optimistic version-conflict detection, and per-change audit history.
- Full multi-channel notification center (in-app + VAPID web push + email) with incident deduplication.
- Temporal pricing versioning (`effectiveFrom/To/active`) + `PricingAuditLog` + `AdminAuditLog`.
- Deep i18n parity testing (keys, types, interpolation tokens) across 5 real translations.
- Timing-attack-resistant login and last-super-admin governance protections.

---

## 34. Critical Risks & Security Findings

1. **P0 — `prisma db push --accept-data-loss` in `deploy.sh`** on a production DB can silently drop data and diverge migration history. Also explains why later schema (analytics/notifications) has no migration file.
2. **P0 — No reverse proxy / TLS in `docker-compose.prod.yml`.** The app binds `127.0.0.1:3010` with no Caddy in the stack → the documented HTTPS/HSTS posture is not actually delivered by the shipped compose.
3. **P1 — GDPR:** analytics consent enforced only client-side; persistent `anonymousId` stored; retention purge unwired.
4. **P1 — CSP retains `script-src 'unsafe-inline'`** in production.
5. **P1 — Rate limiting** is in-memory, duplicated, and the public-API limiter trusts `x-forwarded-for` unconditionally (spoofable; also non-functional across instances/restarts).
6. **P1 — Legal claims:** hard-coded corporate registration/VAT + certification flags defaulting to `true` without a verification source.
7. **P2 — Missing `sitemap.xml`** referenced by robots; robots allow-list points at redirect stubs.
8. **P2 — Middleware** doesn't re-check `active`/role (stale JWT can view admin page shells until a server action re-validates).
9. **P2 — Cron cleanup** is unauthenticated if `CRON_SECRET` is unset (fails open).
10. **P3 — Node version doc mismatch (20 vs 22); no automated DB backup.**

---

## 35. Recommended Priority Roadmap

**P0 — before production**
1. Replace `db push --accept-data-loss` with `prisma migrate deploy`; generate migrations for the analytics/notification schema so history is consistent.
2. Add the reverse-proxy/TLS service (wire `Caddyfile` into `docker-compose.prod.yml`) or document the real external proxy; verify HSTS/HTTPS end-to-end.
3. Add an automated Postgres backup (volume dump + retention) and restore runbook.

**P1 — high**
4. Enforce analytics consent **server-side** in `/api/analytics/collect`; **wire `pruneExpiredAnalyticsData`** to a scheduled cron.
5. Harden CSP: drop `unsafe-inline` (nonce/hash-based scripts).
6. Consolidate to one rate limiter that is TRUST_PROXY-aware and backed by a shared store (Redis); fail-closed on missing `CRON_SECRET`.
7. Verify/parameterize legal entity + certification claims; call `validateProductionLegalCompliance` at boot in production.

**P2 — important**
8. Add `app/sitemap.ts`; fix robots allow-list to localized paths.
9. Re-validate `active`/role in the session/JWT callback (or shorten session TTL).
10. Update README/DEPLOYMENT/VPS docs to reality (i18n = custom, phase status, node version, migration command, 156 tests, actual container set).

**P3 — nice to have**
11. Add real Playwright E2E for the acquisition→dispatch→accept path; wire anomaly-detection emission; remove redundant non-localized route stubs; localize PDF number/date formatting.

---

## 36. Production Readiness Score

| Category | Score/10 | Assessment |
|---|---|---|
| Architecture | 9 | Clean route/domain split, server-only pricing, edge-safe auth |
| Security | 6 | Good AuthN/AuthZ/validation; weak CSP, spoofable/in-memory rate limit, open-if-unset cron |
| Authentication | 9 | JWT + bcrypt-12 + timing-safe + governance protections |
| Authorization | 8 | `requireAdmin`/RBAC on all mutations; middleware doesn't re-check active |
| Data Integrity | 8 | Transactions, versioning, audit, idempotency — but deploy uses `db push --accept-data-loss` |
| Privacy / GDPR | 4 | Consent client-only, retention unwired, hard-coded legal claims |
| Error Handling | 9 | Digest-based boundaries, no leakage, recovery actions |
| Testing | 7 | 156 real unit tests; light E2E/DB-integration; one mock-only governance test |
| Performance | 7 | SSR/SSG, indexed queries, standalone; 25 MB uploads buffered through app |
| Scalability | 5 | In-memory rate limit + local disk storage default limit horizontal scale |
| Observability | 6 | Health probe + incidents + audit logs; no external logging/metrics wired |
| Deployment | 4 | No proxy/TLS in stack, unsafe schema sync, no backups, doc mismatches |
| Documentation | 5 | Thorough but materially outdated/contradictory in places |
| Maintainability | 8 | Clean code, no debt markers, typed; some duplication (rate limiters, route stubs) |

**Overall Production Readiness Score: 66 / 100.**

The *application* is ~8/10; the score is pulled down by *operational/deployment* and *GDPR/compliance* readiness, which are precisely the areas that separate "builds and passes tests" from "safe to run in production."

---

## 37. Final Verdict

**Current state:** 🟡 **Functional but requires hardening.** This is a genuinely capable, well-architected B2B platform whose *core commercial logic is production-grade*, but whose *deployment, privacy, and edge-security posture* are not yet safe to ship.

**Does the current implementation meet the original desired OpsVale project?**
**PARTIALLY — trending YES on scope, NO on operational safety.** Every functional requirement in the master plan is implemented, and several are exceeded; but the delivery/compliance requirements (safe migrations, TLS/proxy, GDPR retention/consent, backups) are unmet or only partially met.

**Is it better or worse than the desired project?**

- **Better:** pricing/excel/quote/proposal engines; notification center; analytics breadth; schema depth; auth hardening; i18n rigor; error hygiene; audit trails.
- **Worse:** deployment safety (`db push --accept-data-loss`, no proxy/TLS in stack, no backups); GDPR (client-only consent, unwired retention, geo dead behind Caddy); CSP `unsafe-inline`; in-memory/duplicated/spoofable rate limiting; missing sitemap.
- **Missing:** sitemap, wired retention, DB backups, proxy service, server-side consent, shared rate-limit store, real E2E.
- **Risks:** silent prod data loss on deploy; unverified legal/certification claims; unauthenticated cron when secret unset; stale-JWT admin page access.

**Top 10 actions required (ranked):**
1. **P0** — Switch deploy to `prisma migrate deploy`; backfill migrations for analytics/notifications schema.
2. **P0** — Add reverse proxy + TLS to the prod compose (or document/verify the external one).
3. **P0** — Automate Postgres backups + restore runbook.
4. **P1** — Enforce analytics consent server-side; schedule retention purge.
5. **P1** — Remove `unsafe-inline` from production CSP (nonce/hash).
6. **P1** — Unify rate limiting; make it TRUST_PROXY-aware and shared-store backed; fail-closed cron.
7. **P1** — Verify/parameterize legal entity + certification claims; enforce at boot.
8. **P2** — Add `sitemap.ts`; correct robots allow-list; re-validate `active` in session.
9. **P2** — Reconcile all documentation (i18n, phases, node, migration command, container set, test count).
10. **P3** — Real Playwright E2E; wire anomaly emission; prune redundant route stubs; localize PDF formatting.

*End of audit. No project code was modified; this document is the sole deliverable.*
