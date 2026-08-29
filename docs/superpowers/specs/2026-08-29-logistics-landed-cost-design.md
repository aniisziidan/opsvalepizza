# Logistics → Landed Cost — Design Spec

**Date:** 2026-08-29
**Status:** Approved (pending spec review)
**Branch (target):** feature branch off `main` (not `harden/audit-p1-items`)

## Problem

`LogisticsCost` (per-country freight + inland + other, managed in the admin Logistics
hub) is captured but **never read by the pricing engine**. Today `lib/pricing/resolvePublicRange`
marks up `LandedCost.costEur` directly, so freight has zero effect on quoted prices. The
unused `CostSource.DYNAMIC` enum value is a fossil of the original intent (landed = product +
logistics) that was never built.

## Confirmed business semantics

- `LandedCost.costEur` is the **product-only / ex-works** cost.
- Freight is **separate** and lives in `LogisticsCost` as per-box adders (`freightEur`,
  `inlandEur`, `otherEur`; defaults such as `0.0250 / 0.0100 / 0.0050` confirm per-unit EUR).
- **Effective landed cost = product cost + freight + inland + other**, and **markup applies to
  the sum**.
- **One active logistics corridor per country** (DB-enforced). Multiple historical/inactive
  corridors are allowed; multiple *active* corridors for the same country are impossible.
- **No active corridor for a country ⇒ add €0** (product-only) and flag `noLogisticsConfigured`.
  This makes rollout safe: prices only change once corridors exist.
- **Snapshot immutability:** every calculator result, quote, and accepted proposal must remain
  reproducible even after a corridor is later edited or deactivated. Cost breakdowns are frozen
  at write time.
- **Customer-facing stays simple:** the customer proposal shows the final delivered price only.
  Internal product-vs-freight margin breakdown is **not** exposed to customers.

## Approach

**Compute-at-read, snapshot-at-write.** `LandedCost.costEur` keeps its product-only meaning
(no backfill). The effective landed cost is computed on the fly in the pricing engine (extended
to accept the country's active corridor) and the full breakdown is frozen into snapshots at
write time. This matches the codebase's existing pure-compute + snapshot pattern, avoids
cascade recomputation, and needs only additive, nullable schema changes.

Rejected alternatives: materializing `effectiveLandedEur` onto `LandedCost` (denormalization +
cascade-on-edit + staleness); modeling logistics as generic additive cost rows (YAGNI given the
one-corridor-per-country rule).

## Components

### 1. Pricing engine (pure, unit-tested — `lib/pricing/`)

- `selectActiveCorridor(corridors, countryId) → Corridor | null`
  Returns the single active corridor for a country (or `null`).

- `effectiveLandedCost(productEur, corridor) → LandedBreakdown`
  ```ts
  interface LandedBreakdown {
    productEur: number;
    freightEur: number;   // 0 when corridor is null
    inlandEur: number;    // 0 when corridor is null
    otherEur: number;     // 0 when corridor is null
    logisticsEur: number; // freight + inland + other
    landedEur: number;    // productEur + logisticsEur
    corridorId: string | null;
    corridorName: string | null;
    noLogisticsConfigured: boolean; // true when corridor is null
  }
  ```
  `corridor = null` ⇒ logistics €0, product-only, `noLogisticsConfigured: true`.

- `resolvePublicRange` gains an optional `logistics: Corridor | null` input. On the **computed
  path** it marks up the **effective landed cost** (`sellingRange(landedEur, markup)`). The
  **approved `PublicPriceRange` override path is unchanged** — it is already a final range and
  logistics is NOT added. The result is enriched with the breakdown so callers can
  snapshot/display it, while `available / minEur / maxEur` remain for backward compatibility:
  ```ts
  interface PublicRangeResult {
    available: boolean;
    minEur: number;
    maxEur: number;
    breakdown: LandedBreakdown | null; // null on the approved-override path
    markupMin: number;
    markupMax: number;
    source: 'APPROVED_RANGE' | 'COMPUTED';
  }
  ```

Call sites updated to fetch the active corridor and pass it through:
- `app/api/calculator/route.ts` (public calculator)
- `app/quote/actions.ts` (quote submission → CalculatorSnapshot)
- admin quote-builder guidance (new read path; see §4)

### 2. One-active-corridor-per-country enforcement

- **DB is the authority:** a **partial unique index** on `LogisticsCost (countryId) WHERE active`
  (raw SQL in the Prisma migration). This makes >1 active corridor per country impossible.
- **Code for UX:** `create` / `update` / `toggle` run in a transaction that deactivates any other
  active corridor for the same country before activating one. Both write paths **catch the
  unique-constraint violation (`P2002`)** and return a clean, friendly error instead of a raw
  500.
- **One-time normalization:** the migration deactivates all-but-newest active corridor where a
  country already has multiples, so the new index can be created without conflict.

### 3. Snapshot immutability

- **`CalculatorSnapshot`** — add nullable columns: `productCostEur`, `logisticsCostId`,
  `logisticsCorridorName`, `freightEur`, `inlandEur`, `otherEur`, `logisticsTotalEur`,
  `effectiveLandedEur` (Decimal(10,4); the corridor name is a string label). Populated at quote
  submission in `app/quote/actions.ts`. Existing rows stay valid (nullable).
- **`Quote`** — add nullable internal `pricingSnapshot Json?` capturing the computed breakdown
  (product, corridor id+name, freight/inland/other, logistics total, effective landed, markup,
  suggested unit price) as guidance at create time, frozen at dispatch. This is **internal-only**
  and is **not** copied into the customer-facing `Quote.snapshot` JSON, so the customer proposal
  keeps showing only the final delivered price.
- Because breakdowns are stored values, later corridor edits/deactivations never mutate them —
  historical calculator results, quotes, and accepted proposals stay reproducible.

### 4. Admin display

- **Pricing Management (detailed):** per box×country, render the full composition —
  base product/factory cost, selected corridor, freight, inland, other, total logistics, effective
  landed cost, then `→ +Markup% → selling range`. Includes audit/history visibility (see §5). This
  is where operators understand why a country's base cost is what it is.
- **Quote Builder (compact):** a guidance panel for the lead's box/country/volume:
  ```
  Factory / Product:   €X
  Logistics to Italy:  €Y
  Landed Cost:         €Z
  Markup:              X%
  Quoted Unit Price:   €N   ← operator still enters the final unit price
  ```
  The operator-entered unit price remains authoritative; the panel is guidance only (no behavior
  change to `createQuote`).
- **Logistics page:** unchanged in purpose — corridor CRUD/configuration.
- **Customer proposal / public calculator:** unchanged — final delivered price / range only. No
  internal product-vs-freight breakdown.

### 5. Audit logging

- Add `LOGISTICS_COST` to the `PricingEntityType` enum.
- Logistics `create` / `update` / `toggle` write a `PricingAuditLog` row (`oldValues` /
  `newValues` = corridor name, route/port/method, freight/inland/other, active) via the existing
  `tx.pricingAuditLog.create({ ... })` pattern, since these edits now move prices.

## Data flow

```
Calculator / Quote submission / Quote-builder guidance
  → load LandedCost tier (product-only) + active LogisticsCost corridor + markup rules
  → effectiveLandedCost(product, corridor) = product + freight + inland + other
  → resolvePublicRange: sellingRange(landedEur, markup)   [computed path]
        OR approved PublicPriceRange                        [override path, no logistics]
  → snapshot the breakdown (CalculatorSnapshot cols / Quote.pricingSnapshot)
  → display: detailed (Pricing Mgmt) | compact (Quote Builder) | final-only (customer)
```

## Error handling

- No active corridor for a country → €0 logistics, `noLogisticsConfigured` flag surfaced in admin
  displays (not an error; pricing still resolves on product-only).
- Attempt to activate a 2nd corridor for a country → DB `P2002`; code returns a friendly
  "Country already has an active corridor" message.
- Missing markup rule (existing behavior) → range `available: false`, unchanged.

## Testing

- **Pure/unit:** `effectiveLandedCost` (sum; null→product-only + flag); `selectActiveCorridor`
  (active vs none); `resolvePublicRange` (logistics added before markup; approved override ignores
  logistics; no-corridor→product-only; breakdown fields correct).
- **Integration (DB):** activating a corridor deactivates the sibling and the partial unique index
  rejects a direct 2nd active insert; **snapshot immutability** — write a CalculatorSnapshot /
  Quote.pricingSnapshot, mutate the corridor, assert stored values unchanged; logistics edit writes
  a `PricingAuditLog` row with correct old/new.
- **Display:** compact and detailed breakdown math via the pure formatter (`product + logistics =
  landed`, markup, unit price).

## Schema / migration footprint

One Prisma migration, all additive:
- `CalculatorSnapshot`: 8 nullable columns (above).
- `Quote`: `pricingSnapshot Json?`.
- `PricingEntityType`: add `LOGISTICS_COST`.
- Raw SQL: normalize existing multi-active corridors, then create partial unique index
  `LogisticsCost (countryId) WHERE active`.

Safe for `prisma migrate deploy` (no data loss, no non-null backfill).

## Out of scope

- Duties/tariffs modeling (only freight/inland/other as today).
- Multiple additive corridors per country (explicitly one active per country).
- Customer-facing cost breakdown.
- Changing how the admin quote unit price is set (stays operator-entered; guidance only).
- Redis / shared rate-limit store and other unrelated audit items.
