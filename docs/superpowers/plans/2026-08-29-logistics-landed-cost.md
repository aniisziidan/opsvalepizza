# Logistics → Landed Cost Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make per-country logistics costs (freight + inland + other) part of the landed cost the pricing engine marks up, with immutable snapshots, DB-enforced one-active-corridor-per-country, admin breakdown displays, and audit logging.

**Architecture:** Compute-at-read, snapshot-at-write. `LandedCost.costEur` stays product-only; effective landed cost = product + logistics is computed by pure functions and frozen into snapshots at write time. All logic lives in pure, unit-tested functions (the repo's test suite is DB-free); thin Prisma/migration glue is verified by `prisma generate` + typecheck + build.

**Tech Stack:** Next.js App Router, Prisma/PostgreSQL, Zod, Vitest (node env, no DB, no jsdom).

---

## File Structure

**New pure modules (unit-tested):**
- `lib/pricing/logistics.ts` — `Corridor`, `CorridorCandidate`, `LandedBreakdown` types; `selectActiveCorridor`, `effectiveLandedCost`.
- `lib/pricing/pricingSnapshot.ts` — `calculatorPricingFields`, `buildQuotePricingSnapshot` (value-capture snapshot builders).
- `lib/pricing/breakdownFormat.ts` — `detailedBreakdownLines`, `compactBreakdownLines`.
- `lib/logistics/enforcement.ts` — `corridorsToDeactivate`.
- `lib/logistics/audit.ts` — `logisticsAuditValues`.

**Modified logic:**
- `lib/pricing/publicRange.ts` — accept `logistics`, return enriched `PublicRangeResult`.

**Schema/migration:**
- `prisma/schema.prisma` — `CalculatorSnapshot` columns, `Quote.pricingSnapshot`, `PricingEntityType.LOGISTICS_COST`.
- `prisma/migrations/20260829_logistics_landed_cost/migration.sql` — ALTERs + normalization + partial unique index.

**Thin wiring (verified by typecheck/build):**
- `app/api/calculator/route.ts` — fetch active corridor, pass logistics.
- `app/quote/actions.ts` — fetch corridor, persist snapshot pricing fields.
- `app/admin/logistics/actions.ts` — enforcement + audit + graceful P2002.
- `lib/admin/queries.ts` — `getActiveCorridorCandidates`, `getQuotePricingGuidance`.
- `app/admin/leads/[id]/quote-actions.ts` — persist `Quote.pricingSnapshot` at create.
- `components/admin/PricingManagement.tsx` + `components/admin/LeadDetailView.tsx` — breakdown displays.

**Branch:** `feat/logistics-landed-cost` (already created off `main`; spec committed).

---

### Task 1: Pricing logistics primitives

**Files:**
- Create: `lib/pricing/logistics.ts`
- Test: `lib/pricing/__tests__/logistics.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/pricing/__tests__/logistics.test.ts
import { describe, it, expect } from 'vitest';
import {
  selectActiveCorridor,
  effectiveLandedCost,
  type CorridorCandidate,
} from '../logistics';

const candidates: CorridorCandidate[] = [
  { id: 'c-de', countryId: 'de', route: 'Rotterdam→Ruhr', freightEur: 0.025, inlandEur: 0.01, otherEur: 0.005, active: true },
  { id: 'c-de-old', countryId: 'de', route: 'old', freightEur: 0.09, inlandEur: 0.0, otherEur: 0.0, active: false },
  { id: 'c-it', countryId: 'it', route: 'Genoa', freightEur: 0.04, inlandEur: 0.02, otherEur: 0.0, active: true },
];

describe('selectActiveCorridor', () => {
  it('returns the active corridor for the country, mapped to a Corridor', () => {
    const c = selectActiveCorridor(candidates, 'de');
    expect(c).toEqual({ id: 'c-de', name: 'Rotterdam→Ruhr', freightEur: 0.025, inlandEur: 0.01, otherEur: 0.005 });
  });
  it('returns null when the country has no active corridor', () => {
    expect(selectActiveCorridor(candidates, 'fr')).toBeNull();
  });
});

describe('effectiveLandedCost', () => {
  it('adds freight + inland + other to the product cost', () => {
    const corridor = selectActiveCorridor(candidates, 'de')!;
    const b = effectiveLandedCost(0.18, corridor);
    expect(b.productEur).toBeCloseTo(0.18, 4);
    expect(b.logisticsEur).toBeCloseTo(0.04, 4);
    expect(b.landedEur).toBeCloseTo(0.22, 4);
    expect(b.corridorId).toBe('c-de');
    expect(b.noLogisticsConfigured).toBe(false);
  });
  it('falls back to product-only with a flag when no corridor', () => {
    const b = effectiveLandedCost(0.18, null);
    expect(b.logisticsEur).toBe(0);
    expect(b.landedEur).toBeCloseTo(0.18, 4);
    expect(b.corridorId).toBeNull();
    expect(b.noLogisticsConfigured).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/pricing/__tests__/logistics.test.ts`
Expected: FAIL — cannot find module `../logistics`.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/pricing/logistics.ts
export interface CorridorCandidate {
  id: string;
  countryId: string;
  route: string | null;
  freightEur: number;
  inlandEur: number;
  otherEur: number;
  active: boolean;
}

export interface Corridor {
  id: string;
  name: string | null;
  freightEur: number;
  inlandEur: number;
  otherEur: number;
}

export interface LandedBreakdown {
  productEur: number;
  freightEur: number;
  inlandEur: number;
  otherEur: number;
  logisticsEur: number;
  landedEur: number;
  corridorId: string | null;
  corridorName: string | null;
  noLogisticsConfigured: boolean;
}

/** The one active corridor for a country (DB guarantees at most one), or null. */
export function selectActiveCorridor(
  candidates: CorridorCandidate[],
  countryId: string,
): Corridor | null {
  const match = candidates.find((c) => c.active && c.countryId === countryId);
  if (!match) return null;
  return {
    id: match.id,
    name: match.route,
    freightEur: match.freightEur,
    inlandEur: match.inlandEur,
    otherEur: match.otherEur,
  };
}

/** Effective landed cost = product cost + freight + inland + other. */
export function effectiveLandedCost(
  productEur: number,
  corridor: Corridor | null,
): LandedBreakdown {
  const freightEur = corridor?.freightEur ?? 0;
  const inlandEur = corridor?.inlandEur ?? 0;
  const otherEur = corridor?.otherEur ?? 0;
  const logisticsEur = freightEur + inlandEur + otherEur;
  return {
    productEur,
    freightEur,
    inlandEur,
    otherEur,
    logisticsEur,
    landedEur: productEur + logisticsEur,
    corridorId: corridor?.id ?? null,
    corridorName: corridor?.name ?? null,
    noLogisticsConfigured: corridor === null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/pricing/__tests__/logistics.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/logistics.ts lib/pricing/__tests__/logistics.test.ts
git commit -m "feat(pricing): add logistics corridor selection + effective landed cost"
```

---

### Task 2: Extend `resolvePublicRange` with logistics

**Files:**
- Modify: `lib/pricing/publicRange.ts`
- Test: `lib/pricing/__tests__/publicRange.test.ts` (extend)

- [ ] **Step 1: Add failing tests for the logistics path**

Append to `lib/pricing/__tests__/publicRange.test.ts` (inside the `describe`):

```ts
  it('adds active-corridor logistics to the landed cost before markup', () => {
    const r = resolvePublicRange({
      ...base,
      logistics: { id: 'c-de', name: 'Rotterdam', freightEur: 0.02, inlandEur: 0.01, otherEur: 0.0 },
    });
    // landed = 0.18 + 0.03 = 0.21
    expect(r.minEur).toBeCloseTo(0.21 * 1.2, 3);
    expect(r.maxEur).toBeCloseTo(0.21 * 1.3, 3);
    expect(r.source).toBe('COMPUTED');
    expect(r.breakdown?.landedEur).toBeCloseTo(0.21, 4);
  });
  it('ignores logistics on the approved-override path', () => {
    const r = resolvePublicRange({
      ...base,
      approvedRange: { minEur: 0.22, maxEur: 0.25 },
      logistics: { id: 'c-de', name: 'x', freightEur: 0.9, inlandEur: 0, otherEur: 0 },
    });
    expect(r.minEur).toBeCloseTo(0.22); expect(r.maxEur).toBeCloseTo(0.25);
    expect(r.source).toBe('APPROVED_RANGE');
    expect(r.breakdown).toBeNull();
  });
  it('is product-only with a flag when no corridor is supplied', () => {
    const r = resolvePublicRange(base);
    expect(r.breakdown?.noLogisticsConfigured).toBe(true);
    expect(r.breakdown?.landedEur).toBeCloseTo(0.18, 4);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/pricing/__tests__/publicRange.test.ts`
Expected: FAIL — `source`/`breakdown` undefined; `logistics` not accepted.

- [ ] **Step 3: Rewrite `lib/pricing/publicRange.ts`**

```ts
import { resolveMarkup, type MarkupRule } from './resolveMarkup';
import { sellingRange } from './sellingRange';
import { effectiveLandedCost, type Corridor, type LandedBreakdown } from './logistics';

export interface LandedCostRow { boxConfigId: string; countryId: string; qtyTierMin: number; qtyTierMax: number | null; costEur: number; active: boolean; }
export interface PublicRangeInputs {
  boxConfigId: string;
  countryId: string;
  monthlyVolume: number;
  approvedRange: { minEur: number; maxEur: number } | null;
  markupRules: MarkupRule[];
  landedCosts: LandedCostRow[];
  logistics?: Corridor | null;
}
export interface PublicRangeResult {
  available: boolean;
  minEur: number;
  maxEur: number;
  breakdown: LandedBreakdown | null;
  markupMin: number;
  markupMax: number;
  source: 'APPROVED_RANGE' | 'COMPUTED';
}

const UNAVAILABLE: PublicRangeResult = {
  available: false, minEur: 0, maxEur: 0, breakdown: null, markupMin: 0, markupMax: 0, source: 'COMPUTED',
};

export function resolvePublicRange(i: PublicRangeInputs): PublicRangeResult {
  if (i.approvedRange) {
    return {
      available: true,
      minEur: i.approvedRange.minEur,
      maxEur: i.approvedRange.maxEur,
      breakdown: null,
      markupMin: 0,
      markupMax: 0,
      source: 'APPROVED_RANGE',
    };
  }
  const tier = i.landedCosts
    .filter((l) => l.active && l.boxConfigId === i.boxConfigId && l.countryId === i.countryId)
    .find((l) => i.monthlyVolume >= l.qtyTierMin && (l.qtyTierMax == null || i.monthlyVolume <= l.qtyTierMax));
  if (!tier) return UNAVAILABLE;

  const breakdown = effectiveLandedCost(tier.costEur, i.logistics ?? null);

  let markup;
  try { markup = resolveMarkup(i.markupRules, { countryId: i.countryId, boxConfigId: i.boxConfigId }); }
  catch { return UNAVAILABLE; }

  const range = sellingRange(breakdown.landedEur, markup);
  return {
    available: true,
    minEur: range.minEur,
    maxEur: range.maxEur,
    breakdown,
    markupMin: markup.markupMin,
    markupMax: markup.markupMax,
    source: 'COMPUTED',
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/pricing/__tests__/publicRange.test.ts`
Expected: PASS (7 tests — 4 original + 3 new).

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/publicRange.ts lib/pricing/__tests__/publicRange.test.ts
git commit -m "feat(pricing): fold logistics into resolvePublicRange with breakdown output"
```

---

### Task 3: Pricing snapshot builders

**Files:**
- Create: `lib/pricing/pricingSnapshot.ts`
- Test: `lib/pricing/__tests__/pricingSnapshot.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/pricing/__tests__/pricingSnapshot.test.ts
import { describe, it, expect } from 'vitest';
import { effectiveLandedCost, type Corridor } from '../logistics';
import { calculatorPricingFields, buildQuotePricingSnapshot } from '../pricingSnapshot';

const corridor: Corridor = { id: 'c-it', name: 'Genoa', freightEur: 0.04, inlandEur: 0.02, otherEur: 0.0 };

describe('calculatorPricingFields', () => {
  it('captures scalar breakdown fields for persistence', () => {
    const fields = calculatorPricingFields(effectiveLandedCost(0.18, corridor));
    expect(fields).toEqual({
      productCostEur: 0.18,
      logisticsCostId: 'c-it',
      logisticsCorridorName: 'Genoa',
      freightEur: 0.04,
      inlandEur: 0.02,
      otherEur: 0,
      logisticsTotalEur: 0.06,
      effectiveLandedEur: 0.24,
    });
  });
  it('is decoupled from later corridor mutation (value capture)', () => {
    const mutable: Corridor = { ...corridor };
    const fields = calculatorPricingFields(effectiveLandedCost(0.18, mutable));
    mutable.freightEur = 9.99;
    expect(fields.freightEur).toBe(0.04);
    expect(fields.effectiveLandedEur).toBeCloseTo(0.24, 4);
  });
});

describe('buildQuotePricingSnapshot', () => {
  it('freezes the full internal breakdown with markup and suggested range', () => {
    const snap = buildQuotePricingSnapshot({
      breakdown: effectiveLandedCost(0.18, corridor),
      markupMin: 0.2,
      markupMax: 0.3,
      suggestedMinEur: 0.288,
      suggestedMaxEur: 0.312,
      capturedAt: '2026-08-29T00:00:00.000Z',
    });
    expect(snap.effectiveLandedEur).toBeCloseTo(0.24, 4);
    expect(snap.markupMinPct).toBe(20);
    expect(snap.markupMaxPct).toBe(30);
    expect(snap.corridorName).toBe('Genoa');
    expect(snap.noLogisticsConfigured).toBe(false);
    expect(snap.capturedAt).toBe('2026-08-29T00:00:00.000Z');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/pricing/__tests__/pricingSnapshot.test.ts`
Expected: FAIL — cannot find module `../pricingSnapshot`.

- [ ] **Step 3: Write implementation**

```ts
// lib/pricing/pricingSnapshot.ts
import type { LandedBreakdown } from './logistics';

export interface CalculatorPricingFields {
  productCostEur: number;
  logisticsCostId: string | null;
  logisticsCorridorName: string | null;
  freightEur: number;
  inlandEur: number;
  otherEur: number;
  logisticsTotalEur: number;
  effectiveLandedEur: number;
}

/** Scalar snapshot of the breakdown for the CalculatorSnapshot row. */
export function calculatorPricingFields(b: LandedBreakdown): CalculatorPricingFields {
  return {
    productCostEur: b.productEur,
    logisticsCostId: b.corridorId,
    logisticsCorridorName: b.corridorName,
    freightEur: b.freightEur,
    inlandEur: b.inlandEur,
    otherEur: b.otherEur,
    logisticsTotalEur: b.logisticsEur,
    effectiveLandedEur: b.landedEur,
  };
}

export interface QuotePricingSnapshot {
  productCostEur: number;
  corridorId: string | null;
  corridorName: string | null;
  freightEur: number;
  inlandEur: number;
  otherEur: number;
  logisticsTotalEur: number;
  effectiveLandedEur: number;
  markupMinPct: number;
  markupMaxPct: number;
  suggestedMinEur: number;
  suggestedMaxEur: number;
  noLogisticsConfigured: boolean;
  capturedAt: string;
}

export function buildQuotePricingSnapshot(input: {
  breakdown: LandedBreakdown;
  markupMin: number;
  markupMax: number;
  suggestedMinEur: number;
  suggestedMaxEur: number;
  capturedAt: string;
}): QuotePricingSnapshot {
  const b = input.breakdown;
  return {
    productCostEur: b.productEur,
    corridorId: b.corridorId,
    corridorName: b.corridorName,
    freightEur: b.freightEur,
    inlandEur: b.inlandEur,
    otherEur: b.otherEur,
    logisticsTotalEur: b.logisticsEur,
    effectiveLandedEur: b.landedEur,
    markupMinPct: Math.round(input.markupMin * 1000) / 10,
    markupMaxPct: Math.round(input.markupMax * 1000) / 10,
    suggestedMinEur: input.suggestedMinEur,
    suggestedMaxEur: input.suggestedMaxEur,
    noLogisticsConfigured: b.noLogisticsConfigured,
    capturedAt: input.capturedAt,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/pricing/__tests__/pricingSnapshot.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/pricingSnapshot.ts lib/pricing/__tests__/pricingSnapshot.test.ts
git commit -m "feat(pricing): value-capture snapshot builders for calculator + quote"
```

---

### Task 4: Breakdown formatters

**Files:**
- Create: `lib/pricing/breakdownFormat.ts`
- Test: `lib/pricing/__tests__/breakdownFormat.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/pricing/__tests__/breakdownFormat.test.ts
import { describe, it, expect } from 'vitest';
import { effectiveLandedCost, type Corridor } from '../logistics';
import { detailedBreakdownLines, compactBreakdownLines } from '../breakdownFormat';

const corridor: Corridor = { id: 'c-it', name: 'Genoa', freightEur: 0.04, inlandEur: 0.02, otherEur: 0.01 };

describe('detailedBreakdownLines', () => {
  it('lists product, each logistics component, total logistics, and landed', () => {
    const lines = detailedBreakdownLines(effectiveLandedCost(0.18, corridor));
    expect(lines.map((l) => l.label)).toEqual([
      'Product / Factory Cost', 'Freight', 'Inland', 'Other', 'Total Logistics', 'Effective Landed Cost',
    ]);
    expect(lines[5].valueEur).toBeCloseTo(0.25, 4);
  });
});

describe('compactBreakdownLines', () => {
  it('shows factory, logistics-to-country, and landed', () => {
    const lines = compactBreakdownLines(effectiveLandedCost(0.18, corridor), 'Italy');
    expect(lines.map((l) => l.label)).toEqual([
      'Factory / Product', 'Logistics to Italy', 'Landed Cost',
    ]);
    expect(lines[1].valueEur).toBeCloseTo(0.07, 4);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/pricing/__tests__/breakdownFormat.test.ts`
Expected: FAIL — cannot find module `../breakdownFormat`.

- [ ] **Step 3: Write implementation**

```ts
// lib/pricing/breakdownFormat.ts
import type { LandedBreakdown } from './logistics';

export interface BreakdownLine { label: string; valueEur: number; }

export function detailedBreakdownLines(b: LandedBreakdown): BreakdownLine[] {
  return [
    { label: 'Product / Factory Cost', valueEur: b.productEur },
    { label: 'Freight', valueEur: b.freightEur },
    { label: 'Inland', valueEur: b.inlandEur },
    { label: 'Other', valueEur: b.otherEur },
    { label: 'Total Logistics', valueEur: b.logisticsEur },
    { label: 'Effective Landed Cost', valueEur: b.landedEur },
  ];
}

export function compactBreakdownLines(b: LandedBreakdown, countryName: string): BreakdownLine[] {
  return [
    { label: 'Factory / Product', valueEur: b.productEur },
    { label: `Logistics to ${countryName}`, valueEur: b.logisticsEur },
    { label: 'Landed Cost', valueEur: b.landedEur },
  ];
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/pricing/__tests__/breakdownFormat.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/breakdownFormat.ts lib/pricing/__tests__/breakdownFormat.test.ts
git commit -m "feat(pricing): detailed + compact landed-cost breakdown formatters"
```

---

### Task 5: Logistics enforcement + audit helpers

**Files:**
- Create: `lib/logistics/enforcement.ts`, `lib/logistics/audit.ts`
- Test: `lib/logistics/__tests__/enforcement.test.ts`, `lib/logistics/__tests__/audit.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// lib/logistics/__tests__/enforcement.test.ts
import { describe, it, expect } from 'vitest';
import { corridorsToDeactivate } from '../enforcement';

describe('corridorsToDeactivate', () => {
  it('returns every currently-active id except the one being kept', () => {
    expect(corridorsToDeactivate(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });
  it('returns empty when the kept id is the only active one', () => {
    expect(corridorsToDeactivate(['b'], 'b')).toEqual([]);
  });
});
```

```ts
// lib/logistics/__tests__/audit.test.ts
import { describe, it, expect } from 'vitest';
import { logisticsAuditValues } from '../audit';

describe('logisticsAuditValues', () => {
  it('captures the auditable corridor fields as plain values', () => {
    expect(
      logisticsAuditValues({
        route: 'Genoa', port: 'Genoa Port', shipMethod: 'Intermodal',
        freightEur: '0.0400', inlandEur: '0.0200', otherEur: null, active: true,
      }),
    ).toEqual({
      route: 'Genoa', port: 'Genoa Port', shipMethod: 'Intermodal',
      freightEur: '0.0400', inlandEur: '0.0200', otherEur: null, active: true,
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run lib/logistics/__tests__/`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write implementations**

```ts
// lib/logistics/enforcement.ts
/** Active corridor ids that must be deactivated so `keepId` becomes the sole active one. */
export function corridorsToDeactivate(activeIds: string[], keepId: string): string[] {
  return activeIds.filter((id) => id !== keepId);
}
```

```ts
// lib/logistics/audit.ts
export interface LogisticsAuditValues {
  route: string | null;
  port: string | null;
  shipMethod: string | null;
  freightEur: string | null;
  inlandEur: string | null;
  otherEur: string | null;
  active: boolean;
}

export function logisticsAuditValues(c: LogisticsAuditValues): LogisticsAuditValues {
  return {
    route: c.route, port: c.port, shipMethod: c.shipMethod,
    freightEur: c.freightEur, inlandEur: c.inlandEur, otherEur: c.otherEur,
    active: c.active,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run lib/logistics/__tests__/`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/logistics/ && git commit -m "feat(logistics): pure enforcement + audit-value helpers"
```

---

### Task 6: Schema + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260829_logistics_landed_cost/migration.sql`

- [ ] **Step 1: Edit `prisma/schema.prisma`**

In `model CalculatorSnapshot`, add before `createdAt`:

```prisma
  productCostEur        Decimal? @db.Decimal(10, 4)
  logisticsCostId       String?
  logisticsCorridorName String?
  freightEur            Decimal? @db.Decimal(10, 4)
  inlandEur             Decimal? @db.Decimal(10, 4)
  otherEur              Decimal? @db.Decimal(10, 4)
  logisticsTotalEur     Decimal? @db.Decimal(10, 4)
  effectiveLandedEur    Decimal? @db.Decimal(10, 4)
```

In `model Quote`, add after `dispatchSla` (or any scalar field): 

```prisma
  pricingSnapshot Json?
```

In `enum PricingEntityType`, add:

```prisma
  LOGISTICS_COST
```

- [ ] **Step 2: Create the migration SQL**

```sql
-- prisma/migrations/20260829_logistics_landed_cost/migration.sql

-- CalculatorSnapshot: freeze the product-vs-logistics breakdown
ALTER TABLE "CalculatorSnapshot"
  ADD COLUMN "productCostEur" DECIMAL(10,4),
  ADD COLUMN "logisticsCostId" TEXT,
  ADD COLUMN "logisticsCorridorName" TEXT,
  ADD COLUMN "freightEur" DECIMAL(10,4),
  ADD COLUMN "inlandEur" DECIMAL(10,4),
  ADD COLUMN "otherEur" DECIMAL(10,4),
  ADD COLUMN "logisticsTotalEur" DECIMAL(10,4),
  ADD COLUMN "effectiveLandedEur" DECIMAL(10,4);

-- Quote: internal-only pricing snapshot (never shown to customers)
ALTER TABLE "Quote" ADD COLUMN "pricingSnapshot" JSONB;

-- Audit coverage for logistics corridor edits
ALTER TYPE "PricingEntityType" ADD VALUE 'LOGISTICS_COST';

-- Normalize any pre-existing multiple active corridors: keep one per country
UPDATE "LogisticsCost" l SET "active" = false
WHERE l."active" = true
  AND l."id" <> (
    SELECT l2."id" FROM "LogisticsCost" l2
    WHERE l2."countryId" = l."countryId" AND l2."active" = true
    ORDER BY l2."id" DESC LIMIT 1
  );

-- Enforce one active corridor per country at the database level
CREATE UNIQUE INDEX "LogisticsCost_active_country_unique"
  ON "LogisticsCost"("countryId") WHERE "active" = true;
```

> Note: Prisma's schema language can't express partial unique indexes, so the index lives only in this migration (fine under `migrate deploy`). `ALTER TYPE ... ADD VALUE` is safe here on PostgreSQL 12+ because the new value is not used within the same migration.

- [ ] **Step 3: Regenerate the Prisma client (no DB needed)**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" — client now exposes the new fields/enum value.

- [ ] **Step 4: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: clean (no usages yet reference the new fields incorrectly).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260829_logistics_landed_cost/
git commit -m "feat(db): landed-cost snapshot columns, Quote.pricingSnapshot, logistics audit type + one-active-corridor index"
```

---

### Task 7: Query helpers for corridors + guidance

**Files:**
- Modify: `lib/admin/queries.ts`
- Test: none (thin Prisma glue; covered by build/typecheck). Pure logic already tested in Tasks 1–4.

- [ ] **Step 1: Add `getActiveCorridorCandidates` and `getQuotePricingGuidance`**

Add near `getLogisticsData` in `lib/admin/queries.ts`:

```ts
import { selectActiveCorridor, effectiveLandedCost, type CorridorCandidate } from '@/lib/pricing/logistics';
import { resolvePublicRange } from '@/lib/pricing/publicRange';
import { detailedBreakdownLines, compactBreakdownLines } from '@/lib/pricing/breakdownFormat';

/** Active logistics corridors as pricing candidates (numbers, not Decimals/strings). */
export async function getActiveCorridorCandidates(): Promise<CorridorCandidate[]> {
  const rows = await prisma.logisticsCost.findMany({ where: { active: true } });
  return rows.map((l) => ({
    id: l.id,
    countryId: l.countryId,
    route: l.route,
    freightEur: l.freightEur ? Number(l.freightEur) : 0,
    inlandEur: l.inlandEur ? Number(l.inlandEur) : 0,
    otherEur: l.otherEur ? Number(l.otherEur) : 0,
    active: l.active,
  }));
}

export interface QuotePricingGuidance {
  available: boolean;
  countryName: string;
  compact: { label: string; valueEur: number }[];
  markupMinPct: number;
  markupMaxPct: number;
  suggestedMinEur: number;
  suggestedMaxEur: number;
  noLogisticsConfigured: boolean;
}

/** Compute the compact pricing guidance shown in the quote builder for a lead. */
export async function getQuotePricingGuidance(leadId: string): Promise<QuotePricingGuidance | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { quoteRequest: true, calcData: true },
  });
  if (!lead) return null;

  const countryCode =
    lead.quoteRequest?.deliveryCountryCode || lead.calcData?.countryCode || null;
  const sizeLabel = lead.quoteRequest?.standardBoxSize || lead.calcData?.boxSize || null;
  const monthlyVolume = lead.quoteRequest?.monthlyVolume || lead.calcData?.monthlyVolume || 0;
  const material = lead.quoteRequest?.material || lead.calcData?.material || 'KRAFT';
  const print = lead.quoteRequest?.print || lead.calcData?.print || 'PLAIN';
  if (!countryCode || !sizeLabel) return null;

  const country = await prisma.country.findUnique({ where: { code: countryCode } });
  const box = await prisma.boxConfig.findUnique({
    where: { sizeLabel_material_print: { sizeLabel, material, print } },
  });
  if (!country || !box) return null;

  const [rules, landed, approved, corridors] = await Promise.all([
    prisma.pricingRule.findMany({
      where: { active: true, OR: [{ scope: 'GLOBAL' }, { countryId: country.id }, { boxConfigId: box.id }] },
    }),
    prisma.landedCost.findMany({ where: { active: true, boxConfigId: box.id, countryId: country.id } }),
    prisma.publicPriceRange.findFirst({ where: { boxConfigId: box.id, countryId: country.id, active: true } }),
    getActiveCorridorCandidates(),
  ]);

  const range = resolvePublicRange({
    boxConfigId: box.id,
    countryId: country.id,
    monthlyVolume,
    approvedRange: approved && approved.active ? { minEur: Number(approved.minEur), maxEur: Number(approved.maxEur) } : null,
    markupRules: rules.map((r) => ({ scope: r.scope, countryId: r.countryId, boxConfigId: r.boxConfigId, markupMin: Number(r.markupMin), markupMax: Number(r.markupMax), active: r.active })),
    landedCosts: landed.map((l) => ({ boxConfigId: l.boxConfigId, countryId: l.countryId, qtyTierMin: l.qtyTierMin, qtyTierMax: l.qtyTierMax, costEur: Number(l.costEur), active: l.active })),
    logistics: selectActiveCorridor(corridors, country.id),
  });

  const breakdown = range.breakdown ?? effectiveLandedCost(0, null);
  return {
    available: range.available,
    countryName: country.name,
    compact: compactBreakdownLines(breakdown, country.name),
    markupMinPct: Math.round(range.markupMin * 1000) / 10,
    markupMaxPct: Math.round(range.markupMax * 1000) / 10,
    suggestedMinEur: range.minEur,
    suggestedMaxEur: range.maxEur,
    noLogisticsConfigured: breakdown.noLogisticsConfigured,
  };
}
```

- [ ] **Step 2: Verify typecheck + build**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add lib/admin/queries.ts
git commit -m "feat(admin): corridor candidates + quote pricing guidance query"
```

---

### Task 8: Wire the public calculator

**Files:**
- Modify: `app/api/calculator/route.ts`

- [ ] **Step 1: Fetch the active corridor and pass it in**

In `app/api/calculator/route.ts`, add to the `Promise.all` a 4th query and pass `logistics`:

```ts
import { selectActiveCorridor } from '@/lib/pricing/logistics';
// ...
  const [rules, landed, approved, corridors] = await Promise.all([
    prisma.pricingRule.findMany({
      where: { active: true, OR: [{ scope: 'GLOBAL' }, { countryId: country.id }, { boxConfigId: box.id }] },
    }),
    prisma.landedCost.findMany({ where: { active: true, boxConfigId: box.id, countryId: country.id } }),
    prisma.publicPriceRange.findFirst({ where: { boxConfigId: box.id, countryId: country.id, active: true } }),
    prisma.logisticsCost.findMany({ where: { active: true, countryId: country.id } }),
  ]);

  const range = resolvePublicRange({
    boxConfigId: box.id,
    countryId: country.id,
    monthlyVolume: inp.monthlyVolume,
    approvedRange: approved && approved.active ? { minEur: Number(approved.minEur), maxEur: Number(approved.maxEur) } : null,
    markupRules: rules.map((r) => ({ scope: r.scope, countryId: r.countryId, boxConfigId: r.boxConfigId, markupMin: Number(r.markupMin), markupMax: Number(r.markupMax), active: r.active })),
    landedCosts: landed.map((l) => ({ boxConfigId: l.boxConfigId, countryId: l.countryId, qtyTierMin: l.qtyTierMin, qtyTierMax: l.qtyTierMax, costEur: Number(l.costEur), active: l.active })),
    logistics: selectActiveCorridor(
      corridors.map((l) => ({ id: l.id, countryId: l.countryId, route: l.route, freightEur: l.freightEur ? Number(l.freightEur) : 0, inlandEur: l.inlandEur ? Number(l.inlandEur) : 0, otherEur: l.otherEur ? Number(l.otherEur) : 0, active: l.active })),
      country.id,
    ),
  });
```

(The customer response via `buildCalculatorResponse(range, savings)` is unchanged — it only reads `minEur/maxEur`, so the customer still sees the final range only.)

- [ ] **Step 2: Verify existing calculator tests + typecheck**

Run: `npx vitest run lib/validation/__tests__/calculator.test.ts && npm run typecheck`
Expected: PASS + clean.

- [ ] **Step 3: Commit**

```bash
git add app/api/calculator/route.ts
git commit -m "feat(calculator): apply active-corridor logistics to the public price range"
```

---

### Task 9: Wire quote submission snapshot

**Files:**
- Modify: `app/quote/actions.ts`

- [ ] **Step 1: Fetch corridor, compute breakdown, persist snapshot fields**

In `app/quote/actions.ts`, inside the `if (payload.calcState)` block where `rangeResult` is computed: add a 4th parallel query for corridors, pass `logistics` into `resolvePublicRange`, and extend `calcSnapshotData` with `calculatorPricingFields`.

Add imports:
```ts
import { selectActiveCorridor } from '@/lib/pricing/logistics';
import { calculatorPricingFields } from '@/lib/pricing/pricingSnapshot';
```

Change the `Promise.all([rules, landed, approved])` to also load corridors:
```ts
      const [rules, landed, approved, corridors] = await Promise.all([
        prisma.pricingRule.findMany({ where: { active: true, OR: [{ scope: 'GLOBAL' }, { countryId: country.id }, { boxConfigId: box.id }] } }),
        prisma.landedCost.findMany({ where: { active: true, boxConfigId: box.id, countryId: country.id } }),
        prisma.publicPriceRange.findFirst({ where: { boxConfigId: box.id, countryId: country.id, active: true } }),
        prisma.logisticsCost.findMany({ where: { active: true, countryId: country.id } }),
      ]);

      const corridor = selectActiveCorridor(
        corridors.map((l) => ({ id: l.id, countryId: l.countryId, route: l.route, freightEur: l.freightEur ? Number(l.freightEur) : 0, inlandEur: l.inlandEur ? Number(l.inlandEur) : 0, otherEur: l.otherEur ? Number(l.otherEur) : 0, active: l.active })),
        country.id,
      );
```

Pass `logistics: corridor` into the existing `resolvePublicRange({ ... })` call.

Then, in the `if (rangeResult.available) { ... calcSnapshotData = { ... } }` block, capture the breakdown and spread the pricing fields. Replace the `calcSnapshotData` assignment's opening so it computes fields first:

```ts
        const pricingFields = calculatorPricingFields(effectiveLandedCost(Number(landed[0] ? landed[0].costEur : 0), corridor));
        calcSnapshotData = {
          // ...existing fields unchanged...
          ...pricingFields,
        };
```

Add `effectiveLandedCost` to the logistics import:
```ts
import { selectActiveCorridor, effectiveLandedCost } from '@/lib/pricing/logistics';
```

And extend the `calcSnapshotData` TypeScript type (the inline object type near the top of the function) with the 8 optional fields:
```ts
    productCostEur: number;
    logisticsCostId: string | null;
    logisticsCorridorName: string | null;
    freightEur: number;
    inlandEur: number;
    otherEur: number;
    logisticsTotalEur: number;
    effectiveLandedEur: number;
```

> The `CalculatorSnapshot` create call spreads `...calcSnapshotData`, so persisting the new columns needs no further change (Prisma client already includes them after Task 6).

- [ ] **Step 2: Verify typecheck + quoteRequest tests**

Run: `npx vitest run lib/validation/__tests__/quoteRequest.test.ts && npm run typecheck`
Expected: PASS + clean.

- [ ] **Step 3: Commit**

```bash
git add app/quote/actions.ts
git commit -m "feat(quote): snapshot the product-vs-logistics breakdown at submission"
```

---

### Task 10: Logistics actions — enforcement, audit, graceful errors

**Files:**
- Modify: `app/admin/logistics/actions.ts`

- [ ] **Step 1: Add enforcement (deactivate siblings), audit logging, and P2002 handling**

Rewrite `createLogisticsCorridor` / `updateLogisticsCorridor` / `toggleLogisticsCorridorActive` to run in a transaction that (a) deactivates other active corridors for the country when activating one, (b) writes a `PricingAuditLog` row, and catches `P2002`.

Add imports:
```ts
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { corridorsToDeactivate } from '@/lib/logistics/enforcement';
import { logisticsAuditValues } from '@/lib/logistics/audit';
```

`createLogisticsCorridor` body:
```ts
export async function createLogisticsCorridor(rawData: unknown) {
  const admin = await requireAdmin();
  const data = logisticsCorridorSchema.parse(rawData);

  try {
    const created = await prisma.$transaction(async (tx) => {
      // New corridors are created active → deactivate any existing active one for the country.
      const activeForCountry = await tx.logisticsCost.findMany({
        where: { countryId: data.countryId, active: true }, select: { id: true },
      });
      const toDeactivate = corridorsToDeactivate(activeForCountry.map((c) => c.id), '');
      if (toDeactivate.length > 0) {
        await tx.logisticsCost.updateMany({ where: { id: { in: toDeactivate } }, data: { active: false } });
      }

      const row = await tx.logisticsCost.create({
        data: {
          countryId: data.countryId,
          route: data.route || null,
          port: data.port || null,
          shipMethod: data.shipMethod || null,
          freightEur: data.freightEur !== null ? new Prisma.Decimal(data.freightEur.toFixed(4)) : null,
          inlandEur: data.inlandEur !== null ? new Prisma.Decimal(data.inlandEur.toFixed(4)) : null,
          otherEur: data.otherEur !== null ? new Prisma.Decimal(data.otherEur.toFixed(4)) : null,
          active: true,
        },
      });

      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id,
          entityType: 'LOGISTICS_COST',
          entityId: row.id,
          action: 'CREATE',
          oldValues: undefined,
          newValues: logisticsAuditValues({ route: row.route, port: row.port, shipMethod: row.shipMethod, freightEur: row.freightEur?.toString() ?? null, inlandEur: row.inlandEur?.toString() ?? null, otherEur: row.otherEur?.toString() ?? null, active: row.active }) as any,
        },
      });

      return row;
    });

    revalidatePath('/admin/logistics');
    return { success: true, id: created.id };
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return { success: false, error: 'This country already has an active logistics corridor. Deactivate it first.' };
    }
    throw err;
  }
}
```

`updateLogisticsCorridor` body (capture before/after for audit; no active change here):
```ts
export async function updateLogisticsCorridor(id: string, rawData: unknown) {
  const admin = await requireAdmin();
  const data = logisticsCorridorSchema.parse(rawData);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.logisticsCost.findUniqueOrThrow({ where: { id } });
      const row = await tx.logisticsCost.update({
        where: { id },
        data: {
          countryId: data.countryId,
          route: data.route || null,
          port: data.port || null,
          shipMethod: data.shipMethod || null,
          freightEur: data.freightEur !== null ? new Prisma.Decimal(data.freightEur.toFixed(4)) : null,
          inlandEur: data.inlandEur !== null ? new Prisma.Decimal(data.inlandEur.toFixed(4)) : null,
          otherEur: data.otherEur !== null ? new Prisma.Decimal(data.otherEur.toFixed(4)) : null,
        },
      });
      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id, entityType: 'LOGISTICS_COST', entityId: id, action: 'VERSION_UPDATE',
          oldValues: logisticsAuditValues({ route: before.route, port: before.port, shipMethod: before.shipMethod, freightEur: before.freightEur?.toString() ?? null, inlandEur: before.inlandEur?.toString() ?? null, otherEur: before.otherEur?.toString() ?? null, active: before.active }) as any,
          newValues: logisticsAuditValues({ route: row.route, port: row.port, shipMethod: row.shipMethod, freightEur: row.freightEur?.toString() ?? null, inlandEur: row.inlandEur?.toString() ?? null, otherEur: row.otherEur?.toString() ?? null, active: row.active }) as any,
        },
      });
      return row;
    });
    revalidatePath('/admin/logistics');
    return { success: true, id: updated.id };
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return { success: false, error: 'This country already has an active logistics corridor.' };
    }
    throw err;
  }
}
```

`toggleLogisticsCorridorActive` body (activating deactivates siblings; audit TOGGLE_ACTIVE):
```ts
export async function toggleLogisticsCorridorActive(id: string, active: boolean) {
  const admin = await requireAdmin();
  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.logisticsCost.findUniqueOrThrow({ where: { id } });
      if (active) {
        const activeForCountry = await tx.logisticsCost.findMany({ where: { countryId: target.countryId, active: true }, select: { id: true } });
        const toDeactivate = corridorsToDeactivate(activeForCountry.map((c) => c.id), id);
        if (toDeactivate.length > 0) {
          await tx.logisticsCost.updateMany({ where: { id: { in: toDeactivate } }, data: { active: false } });
        }
      }
      await tx.logisticsCost.update({ where: { id }, data: { active } });
      await tx.pricingAuditLog.create({
        data: { authorId: admin.id, entityType: 'LOGISTICS_COST', entityId: id, action: 'TOGGLE_ACTIVE', oldValues: { active: target.active } as any, newValues: { active } as any },
      });
    });
    revalidatePath('/admin/logistics');
    return { success: true };
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return { success: false, error: 'This country already has an active logistics corridor.' };
    }
    throw err;
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/admin/logistics/actions.ts
git commit -m "feat(logistics): enforce one active corridor/country, audit edits, graceful unique-constraint errors"
```

---

### Task 11: Persist `Quote.pricingSnapshot` at create

**Files:**
- Modify: `app/admin/leads/[id]/quote-actions.ts`

- [ ] **Step 1: Capture guidance and store it on the new quote**

In `createQuote`, before the transaction, compute guidance; store it on the created quote. Add imports:
```ts
import { getQuotePricingGuidance } from '@/lib/admin/queries';
```

After `const data = quoteInputSchema.parse(rawData);`:
```ts
  const guidance = await getQuotePricingGuidance(leadId).catch(() => null);
  const pricingSnapshot = guidance
    ? {
        productCostEur: guidance.compact.find((l) => l.label === 'Factory / Product')?.valueEur ?? null,
        logisticsTotalEur: guidance.compact.find((l) => l.label.startsWith('Logistics to'))?.valueEur ?? null,
        effectiveLandedEur: guidance.compact.find((l) => l.label === 'Landed Cost')?.valueEur ?? null,
        markupMinPct: guidance.markupMinPct,
        markupMaxPct: guidance.markupMaxPct,
        suggestedMinEur: guidance.suggestedMinEur,
        suggestedMaxEur: guidance.suggestedMaxEur,
        noLogisticsConfigured: guidance.noLogisticsConfigured,
        capturedAt: new Date().toISOString(),
      }
    : undefined;
```

In the `tx.quote.create({ data: { ... } })`, add:
```ts
            pricingSnapshot: pricingSnapshot as any,
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/admin/leads/[id]/quote-actions.ts
git commit -m "feat(quote): freeze internal pricing snapshot when a quote revision is created"
```

---

### Task 12: Admin breakdown displays

**Files:**
- Modify: `components/admin/LeadDetailView.tsx` (compact panel), `app/admin/leads/[id]/page.tsx` (pass guidance)
- Modify: `components/admin/PricingManagement.tsx` (detailed breakdown), `app/admin/pricing/page.tsx` (pass corridors) — only if the pricing view already renders landed costs; otherwise add a read-only breakdown section.

> No component unit tests (the repo has no jsdom/react test setup). These are verified by `npm run build`. Keep the panels driven by the already-tested formatters.

- [ ] **Step 1: Quote builder compact panel — pass guidance into the lead page**

In `app/admin/leads/[id]/page.tsx`, load guidance and pass to `LeadDetailView`:
```ts
import { getQuotePricingGuidance } from '@/lib/admin/queries';
// within the page's data loading:
const pricingGuidance = await getQuotePricingGuidance(params.id).catch(() => null);
// pass as a prop: <LeadDetailView ... pricingGuidance={pricingGuidance} />
```

- [ ] **Step 2: Render the compact panel in `LeadDetailView.tsx`**

Add the prop to the component's props type:
```ts
  pricingGuidance?: {
    available: boolean;
    countryName: string;
    compact: { label: string; valueEur: number }[];
    markupMinPct: number;
    markupMaxPct: number;
    suggestedMinEur: number;
    suggestedMaxEur: number;
    noLogisticsConfigured: boolean;
  } | null;
```

Near the quote-creation form, render (only when guidance is available):
```tsx
{pricingGuidance?.available && (
  <div className="rounded-lg border border-[#c5c6ce] bg-[#f8f9ff] p-4 font-mono-data text-xs space-y-1">
    <p className="font-semibold text-[#041632] uppercase tracking-wider">Pricing guidance</p>
    {pricingGuidance.compact.map((l) => (
      <div key={l.label} className="flex justify-between">
        <span className="text-[#4f5e7e]">{l.label}</span>
        <span className="font-bold text-[#041632]">€{l.valueEur.toFixed(4)}</span>
      </div>
    ))}
    <div className="flex justify-between border-t border-[#c5c6ce]/50 pt-1">
      <span className="text-[#4f5e7e]">Markup</span>
      <span className="font-bold text-[#041632]">{pricingGuidance.markupMinPct}%–{pricingGuidance.markupMaxPct}%</span>
    </div>
    <div className="flex justify-between">
      <span className="text-[#4f5e7e]">Suggested unit price</span>
      <span className="font-bold text-[#e77114]">€{pricingGuidance.suggestedMinEur.toFixed(4)}–€{pricingGuidance.suggestedMaxEur.toFixed(4)}</span>
    </div>
    {pricingGuidance.noLogisticsConfigured && (
      <p className="text-[#b3261e]">No logistics corridor configured for {pricingGuidance.countryName} — freight €0 applied.</p>
    )}
  </div>
)}
```

- [ ] **Step 3: Pricing Management detailed breakdown (guarded, additive)**

If `app/admin/pricing/page.tsx` loads landed-cost rows for a box×country, also load `getActiveCorridorCandidates()` and, for each landed row, render `detailedBreakdownLines(effectiveLandedCost(Number(costEur), selectActiveCorridor(candidates, countryId)))` as a read-only block inside `PricingManagement.tsx`. Use the same line-list markup as Step 2. (If the current pricing UI does not surface per-row landed costs, add a "Landed Cost Composition" section listing each active landed cost with its breakdown; do not alter existing pricing forms.)

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: success; new columns/enum and components compile.

- [ ] **Step 5: Commit**

```bash
git add components/admin/LeadDetailView.tsx app/admin/leads/[id]/page.tsx components/admin/PricingManagement.tsx app/admin/pricing/page.tsx
git commit -m "feat(admin): compact quote-builder pricing panel + detailed landed-cost composition"
```

---

### Task 13: Full verification

- [ ] **Step 1: Run the whole unit suite**

Run: `npm test`
Expected: all suites pass, including the new logistics/pricing/snapshot/format tests (≈16 new tests).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit any final fixups & push**

```bash
git push -u origin feat/logistics-landed-cost
```

- [ ] **Step 5: Open PR** (optional, when ready)

```bash
gh pr create --base main --head feat/logistics-landed-cost --title "Logistics → landed-cost pricing" --body "Implements docs/superpowers/specs/2026-08-29-logistics-landed-cost-design.md"
```

---

## Self-Review notes (author)

- **Spec coverage:** cost model (Tasks 1–2, 8, 9), one-active-corridor DB index + code + P2002 (Tasks 5, 6, 10), snapshot immutability (Tasks 3, 6, 9, 11), admin detailed + compact displays (Tasks 4, 7, 12), audit logging (Tasks 5, 6, 10), customer stays simple (Task 8 note), tests (every pure task + Task 13). ✅
- **DB-free tests:** every non-trivial branch is a pure function with unit tests; Prisma/migration glue is verified by `prisma generate` + typecheck + build (matches the repo's DB-free suite). The partial unique index is enforced/verified at `migrate deploy` time on the VPS, not in vitest.
- **Type consistency:** `Corridor`/`CorridorCandidate`/`LandedBreakdown` (Task 1) are reused verbatim in Tasks 2–12; `resolvePublicRange` returns `PublicRangeResult` with `breakdown/markupMin/markupMax/source` everywhere.
- **Migration safety:** additive/nullable columns; enum add-value isolated; normalization precedes the partial unique index; safe under `migrate deploy`.
