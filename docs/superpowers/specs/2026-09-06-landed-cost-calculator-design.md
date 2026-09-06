# Freeform Landed-Cost Calculator + Log — Design Spec

**Date:** 2026-09-06
**Status:** Approved (proceeding to implementation)
**Branch (target):** `feat/landed-cost-calculator` off `main`

## Problem

Admins have no freeform tool to build up a shipment's landed cost from arbitrary
expense line items and keep a history of those calculations. Today landed cost is
modeled only as two fixed buckets — `LandedCost.costEur` (product-only / ex-works)
plus one `LogisticsCost` corridor per country carrying exactly `freightEur` /
`inlandEur` / `otherEur`. There is no place to itemize the ~16 real-world line items
of an international shipment (factory loading, inland to port, export customs, EUR.1
certificate, ocean freight, insurance, destination THC, customs broker, banking/FX,
contingency, …), compute the per-box landed cost, and save the calculation for later
reference.

### Reference model (the shape we're building for)

Everything is entered as a **shipment total**; €/box is derived from a single
**shipment quantity** (≈100,000 boxes in this example). At least one line (insurance)
is a **range**, so totals are ranges.

| Category (label) | Stage | Shipment cost | €/box |
| --- | --- | --: | --: |
| 🇪🇬 Factory loading | ORIGIN | €100 | €0.0010 |
| 🇪🇬 Inland transport → Alexandria | ORIGIN | €300 | €0.0030 |
| 🇪🇬 Export customs | ORIGIN | €100 | €0.0010 |
| 🇪🇬 Export documents | ORIGIN | €150 | €0.0015 |
| 🇪🇬 Certificate / EUR.1 | ORIGIN | €50 | €0.0005 |
| 🇪🇬 Origin port charges | ORIGIN | €200 | €0.0020 |
| 🚢 Ocean freight | FREIGHT | €1,265 | €0.0127 |
| 🛡 Insurance | FREIGHT | €44–€59 | €0.0004–€0.0006 |
| 🇮🇹 Destination THC | DESTINATION | €300 | €0.0030 |
| 🇮🇹 Port/document charges | DESTINATION | €150 | €0.0015 |
| 🇮🇹 Customs broker | DESTINATION | €200 | €0.0020 |
| 🇮🇹 Customs duty | DESTINATION | €0 | €0.0000 |
| 🚛 Trieste → Milan | DESTINATION | €1,200 | €0.0120 |
| 📦 Unloading | DESTINATION | €100 | €0.0010 |
| 🚛 Empty return | DESTINATION | €150 | €0.0015 |
| 🏦 Banking/FX | FINANCIAL | €150 | €0.0015 |
| ⚠️ Contingency | FINANCIAL | €250 | €0.0025 |

## Confirmed decisions (from brainstorming)

- **Role:** standalone record-keeping tool + its own versioned log. It does **not**
  change quoting or the public calculator. The record is designed so a future
  "push to `LandedCost` tier" action can be added cleanly (see Designed-for-later).
- **Per-box math:** one shipment-quantity input per calculation; every line is a
  shipment total; `€/box = total ÷ shipmentQty`.
- **Ranges:** each line has a `minEur` and `maxEur` (equal for a single value). Totals,
  stage subtotals, and €/box are all ranges.
- **Categorization:** free-text `label` + a fixed `stage` from
  `ORIGIN | FREIGHT | DESTINATION | FINANCIAL`. The log shows per-stage subtotals.
- **Log record:** each calc has a title, destination country, box config, shipment qty,
  and its line items. Editing creates a **new version** (old one retired), mirroring the
  existing `LandedCost` / `PricingRule` versioning + `PricingAuditLog` pattern.
- **Storage:** header row + line items as structured **JSON** on the header (Approach A),
  so a version freezes the entire line set atomically. EUR only.
- **Access:** `requireAdmin`, same as the rest of the pricing/logistics admin surface.

## Data model (Prisma — additive migration)

New model, versioned like `LandedCost` / `PricingRule`:

```prisma
model LandedCostCalc {
  id             String    @id @default(cuid())
  groupId        String    @default(cuid())   // shared across versions of the same calc
  title          String
  countryId      String                        // destination
  country        Country   @relation(fields: [countryId], references: [id])
  boxConfigId    String
  boxConfig      BoxConfig @relation(fields: [boxConfigId], references: [id])
  shipmentQty    Int                           // boxes per shipment
  lines          Json                          // frozen line set (see below)
  shipmentMinEur Decimal   @db.Decimal(12, 2)  // cached, server-computed
  shipmentMaxEur Decimal   @db.Decimal(12, 2)
  perBoxMinEur   Decimal   @db.Decimal(10, 4)
  perBoxMaxEur   Decimal   @db.Decimal(10, 4)
  active         Boolean   @default(true)
  effectiveFrom  DateTime  @default(now())
  effectiveTo    DateTime?
  authorId       String?
  author         AdminUser? @relation(fields: [authorId], references: [id])
  createdAt      DateTime  @default(now())

  @@index([groupId])
  @@index([countryId])
  @@index([boxConfigId])
  @@index([active])
}
```

`lines` JSON = array of:

```ts
{ label: string; stage: 'ORIGIN' | 'FREIGHT' | 'DESTINATION' | 'FINANCIAL';
  minEur: number; maxEur: number }
```

Stage is a validated string constant (not a DB enum, since it lives inside JSON).

Enum change: add `LANDED_COST_CALC` to `PricingEntityType` so it slots into
`PricingAuditLog` with no other schema change.

Back-relations added to `Country`, `BoxConfig`, and `AdminUser`.

**Versioning:** a "calc" is a `groupId` lineage. A brand-new calc generates a fresh
`groupId`. Editing runs a transaction that finds the active row for that `groupId`,
retires it (`active:false`, `effectiveTo:now`), inserts a new active row (same
`groupId`) with the full frozen line set, and writes a `PricingAuditLog` row —
identical in shape to `createLandedCostVersion`.

## Pure compute module — `lib/pricing/landedCostCalc.ts`

```ts
export type Stage = 'ORIGIN' | 'FREIGHT' | 'DESTINATION' | 'FINANCIAL';
export interface CalcLine { label: string; stage: Stage; minEur: number; maxEur: number }

export interface LandedCalcResult {
  stageSubtotals: Record<Stage, { min: number; max: number }>;
  shipmentMin: number;   // Σ line minEur
  shipmentMax: number;   // Σ line maxEur
  perBoxMin: number;     // shipmentMin ÷ shipmentQty
  perBoxMax: number;     // shipmentMax ÷ shipmentQty
}

export function computeLandedCalc(lines: CalcLine[], shipmentQty: number): LandedCalcResult;
```

Pure and unit-tested. Reused by the client (live preview) and the server (authoritative
recompute on save — client-supplied totals are never trusted). `shipmentQty` is
guaranteed `> 0` by validation before this runs.

## Server actions — `app/admin/landed-cost/actions.ts`

`'use server'`, `requireAdmin` + Zod on every call, mirroring `app/admin/pricing/actions.ts`:

- `createLandedCalc(raw)` — new `groupId`.
- `updateLandedCalc(raw)` — version-bump within an existing `groupId`.
- `toggleLandedCalcActive(id, active)` — archive / restore.

Zod validation: `title` non-empty; `countryId` / `boxConfigId` present; `shipmentQty`
integer `> 0`; at least one line; each line `label` non-empty, `stage` in the allowed set,
`minEur ≥ 0`, `maxEur ≥ minEur`. Server recomputes totals via `computeLandedCalc` and
caches `shipmentMinEur/MaxEur` and `perBoxMinEur/MaxEur`. Each mutation writes a
`PricingAuditLog` row (`CREATE` / `VERSION_UPDATE` / `TOGGLE_ACTIVE`) with `entityType:
LANDED_COST_CALC`. `revalidatePath('/admin/landed-cost')`. All mutations transactional.

Read query in `lib/admin/queries.ts`: active calcs for the list, plus on-demand version
history for a `groupId`.

## UI — `/admin/landed-cost` + `components/admin/LandedCostCalculator.tsx`

New top-level **Landed Cost** item in `components/admin/SideNavBar.tsx` (near Pricing /
Logistics). The page (`app/admin/landed-cost/page.tsx`) is a server component that loads
countries, box configs, and saved calcs, then renders the client component with two parts:

- **Builder:** title; destination country (dropdown); box config (dropdown); shipment qty;
  a dynamic table of line rows (`label` · `stage` select · `min €` · `max €`) with
  add/remove. A live totals panel renders per-stage subtotals, the shipment-total range,
  and the €/box range as the admin types (computed client-side via `computeLandedCalc`).
  Save button calls the create/update action.
- **Log:** list of saved (active) calcs — title, country, box, €/box range, updated-at,
  author. Row actions: edit (loads into the builder and saves as a new version), view
  version history, archive / restore.

## Error handling

Zod failures return field-level messages the form renders inline; no raw 500s. Missing
country/box config → friendly error. All mutations run in a transaction so a failed audit
write rolls back the version change. `requireAdmin` guards every action.

## Testing

- **Unit** (`lib/pricing/__tests__/landedCostCalc.test.ts`): stage subtotals; min/max
  summation; per-box division; single-value lines (`min == max`); empty / single-line
  edges; the reference-model table totals. Zod schema accept/reject cases.
- **Integration (DB)**: create → edit retires the old version and keeps group history;
  audit row written with correct `oldValues` / `newValues`; toggle archive/restore.
- Follows the existing `__tests__/` conventions and the pure-compute + snapshot pattern.

## Migration footprint

One Prisma migration, all additive and safe for `prisma migrate deploy` (no data loss,
no non-null backfill of existing rows):

- New table `LandedCostCalc` + its indexes and relations.
- Add `LANDED_COST_CALC` to the `PricingEntityType` enum.
- Back-relation fields on `Country`, `BoxConfig`, `AdminUser` (no column changes on those
  tables — relations only).

## Designed-for-later (not built now)

The saved record captures enough (per-box range, stage subtotals, box + country) to later
add a `pushToLandedCostTier` action. **Tension to resolve then, not now:**
`LandedCost.costEur` is **product-only** and freight lives separately in `LogisticsCost`,
so pushing a *full* landed figure would double-count against an existing corridor. The
future push must choose product-only-portion vs. override. Today we only store the data.

## Out of scope (v1)

- Percentage-of-subtotal lines (e.g. contingency as a %) — flat EUR only.
- Multi-currency / FX conversion — EUR only (“Banking/FX” is just a EUR line).
- CSV / PDF export of a calculation.
- Any customer-facing exposure.
- The actual pricing-engine push (`pushToLandedCostTier`).
