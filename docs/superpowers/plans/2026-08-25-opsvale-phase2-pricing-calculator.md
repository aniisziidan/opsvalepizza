# OpsVale Phase 2 — Pricing Engine + Calculator API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** Replace the calculator's hardcoded client-side math with a real, server-side pricing engine: resolve the Global→Country→Product markup hierarchy, assemble/override landed cost, compute an approved public price range, calculate savings, expose a public calculator API that returns ONLY public data, and rewire the calculator UI to it.

**Architecture:** Pure, unit-tested business logic in `lib/pricing/**` and `lib/calculator/**` (framework-agnostic, server-only). A single POST route handler `app/api/calculator/route.ts` validates input with Zod and returns public range + savings (never landed cost or markup). Seed real pricing rows so the engine returns numbers. The client calculator calls the API on first "Calculate" and auto-recalculates on input change thereafter.

**Tech Stack:** TypeScript, Prisma (Postgres), Zod, Vitest, Next.js route handler, Prisma.Decimal.

**Security invariant (spec §30, §42, §47):** The API response and any type it uses MUST NOT contain landed cost, markup %, or internal cost components. Only: public min/max EUR price, savings figures derived from the customer's own inputs, and a missing-data flag. This is asserted by a test.

---

## Task 1: Markup hierarchy resolver

**Files:**
- Create: `lib/pricing/resolveMarkup.ts`
- Test: `lib/pricing/__tests__/resolveMarkup.test.ts`

Resolves which `PricingRule` applies given a country and box config, honoring precedence PRODUCT > COUNTRY > GLOBAL (spec §29), and clamps markup to [0.15, 0.45] (spec §28). Works on plain input objects (not Prisma queries) so it is pure and testable.

- [ ] **Step 1: Write failing tests**

```ts
// lib/pricing/__tests__/resolveMarkup.test.ts
import { describe, it, expect } from 'vitest';
import { resolveMarkup, type MarkupRule } from '../resolveMarkup';

const rules: MarkupRule[] = [
  { scope: 'GLOBAL', countryId: null, boxConfigId: null, markupMin: 0.25, markupMax: 0.25, active: true },
  { scope: 'COUNTRY', countryId: 'de', boxConfigId: null, markupMin: 0.30, markupMax: 0.30, active: true },
  { scope: 'PRODUCT', countryId: 'de', boxConfigId: 'box12wp', markupMin: 0.35, markupMax: 0.35, active: true },
];

describe('resolveMarkup', () => {
  it('picks the product-specific rule when country+box match (spec §29 example ⇒ 35%)', () => {
    const r = resolveMarkup(rules, { countryId: 'de', boxConfigId: 'box12wp' });
    expect(r.markupMin).toBeCloseTo(0.35);
    expect(r.source).toBe('PRODUCT');
  });
  it('falls back to country rule when no product rule matches', () => {
    const r = resolveMarkup(rules, { countryId: 'de', boxConfigId: 'other' });
    expect(r.markupMin).toBeCloseTo(0.30);
    expect(r.source).toBe('COUNTRY');
  });
  it('falls back to global when no country rule matches', () => {
    const r = resolveMarkup(rules, { countryId: 'fr', boxConfigId: 'other' });
    expect(r.markupMin).toBeCloseTo(0.25);
    expect(r.source).toBe('GLOBAL');
  });
  it('clamps markup into [0.15, 0.45]', () => {
    const wild: MarkupRule[] = [{ scope: 'GLOBAL', countryId: null, boxConfigId: null, markupMin: 0.05, markupMax: 0.90, active: true }];
    const r = resolveMarkup(wild, { countryId: 'x', boxConfigId: 'y' });
    expect(r.markupMin).toBeCloseTo(0.15);
    expect(r.markupMax).toBeCloseTo(0.45);
  });
  it('ignores inactive rules', () => {
    const r = resolveMarkup(
      [{ scope: 'GLOBAL', countryId: null, boxConfigId: null, markupMin: 0.25, markupMax: 0.25, active: true },
       { scope: 'PRODUCT', countryId: 'de', boxConfigId: 'box12wp', markupMin: 0.35, markupMax: 0.35, active: false }],
      { countryId: 'de', boxConfigId: 'box12wp' });
    expect(r.source).toBe('GLOBAL');
  });
  it('throws when no rule matches at all', () => {
    expect(() => resolveMarkup([], { countryId: 'x', boxConfigId: 'y' })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL** — `npm test -- resolveMarkup` → module not found.

- [ ] **Step 3: Implement**

```ts
// lib/pricing/resolveMarkup.ts
export type RuleScope = 'GLOBAL' | 'COUNTRY' | 'PRODUCT';
export interface MarkupRule {
  scope: RuleScope;
  countryId: string | null;
  boxConfigId: string | null;
  markupMin: number;
  markupMax: number;
  active: boolean;
}
export interface ResolvedMarkup { markupMin: number; markupMax: number; source: RuleScope; }

const MIN = 0.15, MAX = 0.45;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));

export function resolveMarkup(rules: MarkupRule[], ctx: { countryId: string; boxConfigId: string }): ResolvedMarkup {
  const active = rules.filter((r) => r.active);
  const product = active.find((r) => r.scope === 'PRODUCT' && r.countryId === ctx.countryId && r.boxConfigId === ctx.boxConfigId);
  const country = active.find((r) => r.scope === 'COUNTRY' && r.countryId === ctx.countryId);
  const global = active.find((r) => r.scope === 'GLOBAL');
  const chosen = product ?? country ?? global;
  if (!chosen) throw new Error('No applicable pricing rule (missing GLOBAL default)');
  return { markupMin: clamp(chosen.markupMin), markupMax: clamp(chosen.markupMax), source: chosen.scope };
}
```

- [ ] **Step 4: Run tests, expect PASS** — `npm test -- resolveMarkup`.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(pricing): markup hierarchy resolver with clamp"`

## Task 2: Landed cost + selling range

**Files:**
- Create: `lib/pricing/sellingRange.ts`
- Test: `lib/pricing/__tests__/sellingRange.test.ts`

Given a landed cost (already resolved for a qty tier) and a resolved markup, compute the internal selling price range: `landed × (1 + markupMin) … landed × (1 + markupMax)` (spec §28). Pure function. This range is INTERNAL — it feeds public range computation but is not itself returned publicly unless there is no manual public override.

- [ ] **Step 1: Write failing tests** (uses spec §28 example: landed 0.18 → 0.207…0.261 at 15/45%)

```ts
// lib/pricing/__tests__/sellingRange.test.ts
import { describe, it, expect } from 'vitest';
import { sellingRange } from '../sellingRange';
describe('sellingRange', () => {
  it('computes range from landed cost and markup (spec §28)', () => {
    const r = sellingRange(0.18, { markupMin: 0.15, markupMax: 0.45 });
    expect(r.minEur).toBeCloseTo(0.207, 3);
    expect(r.maxEur).toBeCloseTo(0.261, 3);
  });
  it('returns min<=max even if markups equal', () => {
    const r = sellingRange(0.20, { markupMin: 0.30, markupMax: 0.30 });
    expect(r.minEur).toBeCloseTo(0.26, 3);
    expect(r.maxEur).toBeCloseTo(0.26, 3);
  });
  it('throws on non-positive landed cost', () => {
    expect(() => sellingRange(0, { markupMin: 0.2, markupMax: 0.3 })).toThrow();
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL.**

- [ ] **Step 3: Implement**

```ts
// lib/pricing/sellingRange.ts
export interface Markup { markupMin: number; markupMax: number; }
export interface PriceRange { minEur: number; maxEur: number; }
export function sellingRange(landedEur: number, m: Markup): PriceRange {
  if (!(landedEur > 0)) throw new Error('landed cost must be positive');
  const a = landedEur * (1 + m.markupMin);
  const b = landedEur * (1 + m.markupMax);
  return { minEur: Math.min(a, b), maxEur: Math.max(a, b) };
}
```

- [ ] **Step 4: Run tests, expect PASS.**

- [ ] **Step 5: Commit** — `git commit -m "feat(pricing): selling range from landed cost + markup"`

## Task 3: Savings calculator formulas

**Files:**
- Create: `lib/calculator/savings.ts`
- Test: `lib/calculator/__tests__/savings.test.ts`

Implements spec §9 formulas against a public price RANGE (produces conservative + optimistic savings). Pure.

- [ ] **Step 1: Write failing tests**

```ts
// lib/calculator/__tests__/savings.test.ts
import { describe, it, expect } from 'vitest';
import { computeSavings } from '../savings';
describe('computeSavings', () => {
  const input = { currentPrice: 0.35, monthlyVolume: 20000, priceRange: { minEur: 0.21, maxEur: 0.26 } };
  it('savings per box uses the range (best vs worst)', () => {
    const r = computeSavings(input);
    // best case = current - min ; worst case = current - max
    expect(r.savingsPerBoxMax).toBeCloseTo(0.14, 4);
    expect(r.savingsPerBoxMin).toBeCloseTo(0.09, 4);
  });
  it('annual volume is monthly × 12', () => {
    expect(computeSavings(input).annualVolume).toBe(240000);
  });
  it('yearly savings = perBox × monthly × 12', () => {
    const r = computeSavings(input);
    expect(r.yearlySavingsMax).toBeCloseTo(0.14 * 240000, 2);
    expect(r.yearlySavingsMin).toBeCloseTo(0.09 * 240000, 2);
  });
  it('savings percent is relative to current price', () => {
    const r = computeSavings(input);
    expect(r.savingsPctMax).toBeCloseTo((0.14 / 0.35) * 100, 2);
  });
  it('never returns negative savings (clamps at 0) when OpsVale is more expensive', () => {
    const r = computeSavings({ currentPrice: 0.20, monthlyVolume: 1000, priceRange: { minEur: 0.21, maxEur: 0.26 } });
    expect(r.savingsPerBoxMin).toBe(0);
    expect(r.yearlySavingsMin).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL.**

- [ ] **Step 3: Implement**

```ts
// lib/calculator/savings.ts
export interface SavingsInput { currentPrice: number; monthlyVolume: number; priceRange: { minEur: number; maxEur: number }; }
export interface SavingsResult {
  annualVolume: number;
  savingsPerBoxMin: number; savingsPerBoxMax: number;
  savingsPctMin: number; savingsPctMax: number;
  yearlySavingsMin: number; yearlySavingsMax: number;
}
const nn = (v: number) => Math.max(0, v);
export function computeSavings({ currentPrice, monthlyVolume, priceRange }: SavingsInput): SavingsResult {
  const annualVolume = monthlyVolume * 12;
  const perBoxMax = nn(currentPrice - priceRange.minEur); // biggest saving vs cheapest OpsVale price
  const perBoxMin = nn(currentPrice - priceRange.maxEur); // smallest saving vs priciest OpsVale price
  return {
    annualVolume,
    savingsPerBoxMin: perBoxMin,
    savingsPerBoxMax: perBoxMax,
    savingsPctMin: currentPrice > 0 ? (perBoxMin / currentPrice) * 100 : 0,
    savingsPctMax: currentPrice > 0 ? (perBoxMax / currentPrice) * 100 : 0,
    yearlySavingsMin: perBoxMin * annualVolume,
    yearlySavingsMax: perBoxMax * annualVolume,
  };
}
```

- [ ] **Step 4: Run tests, expect PASS.**

- [ ] **Step 5: Commit** — `git commit -m "feat(calculator): savings formulas over price range (spec §9)"`

## Task 4: Public range resolver (DB-backed) + engine glue

**Files:**
- Create: `lib/pricing/publicRange.ts`
- Test: `lib/pricing/__tests__/publicRange.test.ts`

Given identifiers, produce the approved PUBLIC price range: if a `PublicPriceRange` row exists (manual override or approved), use it; otherwise compute from landed cost (best qty tier) + resolved markup via `sellingRange`. This module takes already-fetched plain data (arrays of rules, landed costs, and an optional public row) so it stays pure/testable; the DB fetch happens in the API route.

- [ ] **Step 1: Write failing tests**

```ts
// lib/pricing/__tests__/publicRange.test.ts
import { describe, it, expect } from 'vitest';
import { resolvePublicRange, type PublicRangeInputs } from '../publicRange';

const base: PublicRangeInputs = {
  boxConfigId: 'b1', countryId: 'de', monthlyVolume: 20000,
  approvedRange: null,
  markupRules: [{ scope: 'GLOBAL', countryId: null, boxConfigId: null, markupMin: 0.2, markupMax: 0.3, active: true }],
  landedCosts: [{ boxConfigId: 'b1', countryId: 'de', qtyTierMin: 0, qtyTierMax: null, costEur: 0.18, active: true }],
};

describe('resolvePublicRange', () => {
  it('uses the approved/override range when present, ignoring internal cost', () => {
    const r = resolvePublicRange({ ...base, approvedRange: { minEur: 0.22, maxEur: 0.25 } });
    expect(r.available).toBe(true);
    expect(r.minEur).toBeCloseTo(0.22); expect(r.maxEur).toBeCloseTo(0.25);
  });
  it('computes from landed cost + markup when no approved range', () => {
    const r = resolvePublicRange(base);
    expect(r.available).toBe(true);
    expect(r.minEur).toBeCloseTo(0.18 * 1.2, 3);
    expect(r.maxEur).toBeCloseTo(0.18 * 1.3, 3);
  });
  it('selects the landed cost tier matching monthly volume', () => {
    const r = resolvePublicRange({ ...base, monthlyVolume: 60000, landedCosts: [
      { boxConfigId: 'b1', countryId: 'de', qtyTierMin: 0, qtyTierMax: 49999, costEur: 0.20, active: true },
      { boxConfigId: 'b1', countryId: 'de', qtyTierMin: 50000, qtyTierMax: null, costEur: 0.16, active: true },
    ]});
    expect(r.minEur).toBeCloseTo(0.16 * 1.2, 3);
  });
  it('reports unavailable when neither approved range nor landed cost exists (spec §10)', () => {
    const r = resolvePublicRange({ ...base, landedCosts: [] });
    expect(r.available).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL.**

- [ ] **Step 3: Implement** (compose Task 1 + Task 2)

```ts
// lib/pricing/publicRange.ts
import { resolveMarkup, type MarkupRule } from './resolveMarkup';
import { sellingRange } from './sellingRange';

export interface LandedCostRow { boxConfigId: string; countryId: string; qtyTierMin: number; qtyTierMax: number | null; costEur: number; active: boolean; }
export interface PublicRangeInputs {
  boxConfigId: string; countryId: string; monthlyVolume: number;
  approvedRange: { minEur: number; maxEur: number } | null;
  markupRules: MarkupRule[];
  landedCosts: LandedCostRow[];
}
export interface PublicRangeResult { available: boolean; minEur: number; maxEur: number; }

export function resolvePublicRange(i: PublicRangeInputs): PublicRangeResult {
  if (i.approvedRange) return { available: true, minEur: i.approvedRange.minEur, maxEur: i.approvedRange.maxEur };
  const tier = i.landedCosts
    .filter((l) => l.active && l.boxConfigId === i.boxConfigId && l.countryId === i.countryId)
    .find((l) => i.monthlyVolume >= l.qtyTierMin && (l.qtyTierMax == null || i.monthlyVolume <= l.qtyTierMax));
  if (!tier) return { available: false, minEur: 0, maxEur: 0 };
  let markup;
  try { markup = resolveMarkup(i.markupRules, { countryId: i.countryId, boxConfigId: i.boxConfigId }); }
  catch { return { available: false, minEur: 0, maxEur: 0 }; }
  const range = sellingRange(tier.costEur, markup);
  return { available: true, minEur: range.minEur, maxEur: range.maxEur };
}
```

- [ ] **Step 4: Run tests, expect PASS.**

- [ ] **Step 5: Commit** — `git commit -m "feat(pricing): public range resolver (approved override or computed)"`

## Task 5: Seed pricing reference data

**Files:**
- Modify: `prisma/seed.ts`

Add BoxConfigs, a GLOBAL PricingRule, LandedCosts, and PublicPriceRanges so the calculator returns real numbers. Map the UI's three sizes (`28cm`,`32cm`,`40cm`) × materials/prints. Seed for the 5 seeded countries.

- [ ] **Step 1: Extend seed** — add, using upsert/idempotent patterns:
  - `BoxConfig` rows for sizes `28cm`,`32cm`,`40cm` × material `KRAFT`/`WHITE` × print `PLAIN`/`PRINTED` (12 configs). Use `@@unique([sizeLabel, material, print])` for upsert `where`.
  - One `PricingRule` scope `GLOBAL`, markupMin 0.20, markupMax 0.35, active.
  - `LandedCost` rows per (boxConfig, country) with two qty tiers (0–49999 and 50000+), plausible `costEur` (e.g. 28cm kraft plain ≈ 0.15/0.13; larger/white/printed higher). Source `MANUAL`.
  - Leave `PublicPriceRange` empty for most (engine computes), but add ONE manual override row to exercise that path (e.g. 32cm WHITE PRINTED / DE).
  - Guard with a deterministic key so re-running the seed doesn't duplicate (upsert on unique or find-then-create).

- [ ] **Step 2: Run seed** — `npx prisma db seed`. Expected: no errors; `psql`/Prisma Studio shows 12 box configs, 1 global rule, landed costs, 1 public override.

- [ ] **Step 3: Commit** — `git commit -m "feat(seed): box configs, global markup, landed costs, one public override"`

## Task 6: Calculator API route

**Files:**
- Create: `app/api/calculator/route.ts`, `lib/validation/calculator.ts`
- Test: `lib/validation/__tests__/calculator.test.ts`

POST endpoint. Validates body with Zod, maps UI size/material/print to a `BoxConfig`, fetches rules+landed+approved range for that config+country, calls `resolvePublicRange` + `computeSavings`, returns public-only JSON. Missing data → `{ available: false, ... }` with 200 (not an error) so the UI shows the "request a quote" message (spec §10). **Returns NO landed cost or markup.**

- [ ] **Step 1: Write failing test for the Zod schema**

```ts
// lib/validation/__tests__/calculator.test.ts
import { describe, it, expect } from 'vitest';
import { calculatorInputSchema } from '../calculator';
describe('calculatorInputSchema', () => {
  it('accepts valid input', () => {
    const r = calculatorInputSchema.safeParse({ countryCode: 'DE', boxSize: '32cm', material: 'kraft', print: 'plain', boxesPerOrder: 5000, monthlyVolume: 20000, currentPrice: 0.35 });
    expect(r.success).toBe(true);
  });
  it('rejects non-positive volume and price', () => {
    expect(calculatorInputSchema.safeParse({ countryCode: 'DE', boxSize: '32cm', material: 'kraft', print: 'plain', boxesPerOrder: 0, monthlyVolume: 0, currentPrice: -1 }).success).toBe(false);
  });
  it('rejects unknown enum values', () => {
    expect(calculatorInputSchema.safeParse({ countryCode: 'DE', boxSize: '99cm', material: 'kraft', print: 'plain', boxesPerOrder: 5000, monthlyVolume: 20000, currentPrice: 0.35 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL.**

- [ ] **Step 3: Implement schema** `lib/validation/calculator.ts`

```ts
import { z } from 'zod';
export const calculatorInputSchema = z.object({
  countryCode: z.string().length(2),
  boxSize: z.enum(['28cm', '32cm', '40cm']),
  material: z.enum(['kraft', 'white']),
  print: z.enum(['plain', 'custom']),
  boxesPerOrder: z.coerce.number().int().positive(),
  monthlyVolume: z.coerce.number().int().positive(),
  currentPrice: z.coerce.number().positive(),
});
export type CalculatorInput = z.infer<typeof calculatorInputSchema>;
```
Note: UI `print` union is `'plain'|'custom'`; map `custom`→`PRINTED`, `plain`→`PLAIN`; `material` `kraft`→`KRAFT`, `white`→`WHITE`.

- [ ] **Step 4: Run test, expect PASS.**

- [ ] **Step 5: Implement the route** `app/api/calculator/route.ts`

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculatorInputSchema } from '@/lib/validation/calculator';
import { resolvePublicRange } from '@/lib/pricing/publicRange';
import { computeSavings } from '@/lib/calculator/savings';

export async function POST(req: Request) {
  const parsed = calculatorInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const inp = parsed.data;
  const material = inp.material === 'white' ? 'WHITE' : 'KRAFT';
  const print = inp.print === 'custom' ? 'PRINTED' : 'PLAIN';

  const country = await prisma.country.findUnique({ where: { code: inp.countryCode } });
  const box = await prisma.boxConfig.findUnique({ where: { sizeLabel_material_print: { sizeLabel: inp.boxSize, material, print } } });
  if (!country || !box) {
    return NextResponse.json({ available: false, reason: 'unsupported_combination' });
  }
  const [rules, landed, approved] = await Promise.all([
    prisma.pricingRule.findMany({ where: { active: true, OR: [{ scope: 'GLOBAL' }, { countryId: country.id }, { boxConfigId: box.id }] } }),
    prisma.landedCost.findMany({ where: { active: true, boxConfigId: box.id, countryId: country.id } }),
    prisma.publicPriceRange.findUnique({ where: { boxConfigId_countryId: { boxConfigId: box.id, countryId: country.id } } }),
  ]);

  const range = resolvePublicRange({
    boxConfigId: box.id, countryId: country.id, monthlyVolume: inp.monthlyVolume,
    approvedRange: approved && approved.active ? { minEur: Number(approved.minEur), maxEur: Number(approved.maxEur) } : null,
    markupRules: rules.map((r) => ({ scope: r.scope, countryId: r.countryId, boxConfigId: r.boxConfigId, markupMin: Number(r.markupMin), markupMax: Number(r.markupMax), active: r.active })),
    landedCosts: landed.map((l) => ({ boxConfigId: l.boxConfigId, countryId: l.countryId, qtyTierMin: l.qtyTierMin, qtyTierMax: l.qtyTierMax, costEur: Number(l.costEur), active: l.active })),
  });

  if (!range.available) return NextResponse.json({ available: false, reason: 'no_estimate' });

  const savings = computeSavings({ currentPrice: inp.currentPrice, monthlyVolume: inp.monthlyVolume, priceRange: { minEur: range.minEur, maxEur: range.maxEur } });
  return NextResponse.json({
    available: true,
    priceRange: { minEur: round4(range.minEur), maxEur: round4(range.maxEur) },
    savings: {
      perBoxMin: round4(savings.savingsPerBoxMin), perBoxMax: round4(savings.savingsPerBoxMax),
      pctMin: round1(savings.savingsPctMin), pctMax: round1(savings.savingsPctMax),
      yearlyMin: round2(savings.yearlySavingsMin), yearlyMax: round2(savings.yearlySavingsMax),
      annualVolume: savings.annualVolume,
    },
  });
}
const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
const round2 = (n: number) => Math.round(n * 1e2) / 1e2;
const round1 = (n: number) => Math.round(n * 10) / 10;
```

- [ ] **Step 6: Add a test asserting the response never contains internal cost.** Create `app/api/calculator/__tests__/no-cost-leak.test.ts` that imports the route's response-shaping (extract the response-building into a small pure helper if needed to test without a live DB, OR write an integration test hitting the running dev server). Assert the JSON has no `landed`, `markup`, or `cost` keys. Run and confirm PASS.

- [ ] **Step 7: Manual verify** — with dev server + seeded DB: `curl -X POST localhost:3000/api/calculator -H "content-type: application/json" -d '{"countryCode":"DE","boxSize":"32cm","material":"kraft","print":"plain","boxesPerOrder":5000,"monthlyVolume":60000,"currentPrice":0.35}'` returns `available:true` with a price range and savings, no cost fields. An unsupported combo returns `available:false`.

- [ ] **Step 8: Commit** — `git commit -m "feat(api): public calculator endpoint returning range+savings only (no cost leak)"`

## Task 7: Rewire the calculator UI to the API

**Files:**
- Modify: `components/SavingsCalculatorPage.tsx`

Replace the hardcoded client math with API calls. Keep the existing look. Behavior per spec §7–8: first result requires clicking "Calculate My Potential Savings"; after that, changing any input auto-recalculates (debounced). Inputs stay editable/visible. Missing-data → show the spec §10 message + "Request an Exact Quote" CTA carrying current inputs. Keep the expandable breakdown + disclaimer.

- [ ] **Step 1:** Add a typed `fetchEstimate(input)` calling `POST /api/calculator`; a `result` state; `hasCalculated` gate. On first calculate click → fetch. On subsequent input changes while `hasCalculated` → debounced (~400ms) refetch. READ the current component first to reuse its state variables (country, boxSize, material, print, boxesPerOrder, monthlyVolume, currentPrice) and its formatting helpers.
- [ ] **Step 2:** Render `priceRange.minEur–maxEur`, savings per box (⭐ emphasis), yearly savings (⭐), percentage — from the API result, not local math. Show the range as `€min–€max per box`. Prominently show yearly savings + per-box (spec §8).
- [ ] **Step 3:** Missing-data branch: when `available === false`, hide the numbers and show: "We don't yet have an instant estimate for this exact requirement. Request an exact quote and we'll review your requirements within 24 business hours." + the existing "Request an Exact Quote" button, carrying current inputs via the existing query-string handoff.
- [ ] **Step 4:** Keep the expandable breakdown (current price, OpsVale range, savings/box, %, monthly & annual volume, monthly & yearly savings, assumptions) and the disclaimer text.
- [ ] **Step 5: Verify** — `npm run typecheck`, `npm run build`, and manual: calculate → see numbers; change current price → auto-updates; pick a combo with no data → see the quote message.
- [ ] **Step 6: Commit** — `git commit -m "feat(calculator): drive UI from server pricing API with auto-recalc and missing-data path"`

---

## Self-Review — coverage
- §9 formulas → Task 3. §28 markup range → Task 2. §29 hierarchy → Task 1. §30 public range/override → Task 4. §10 missing data → Task 4 + Task 6 + Task 7. §7–8 UX/results → Task 7. §41 validation → Task 6. §42/§47 no cost leak → Task 6 Step 6 (asserted). Seed to make it real → Task 5.
- Type consistency: `PriceRange {minEur,maxEur}` shared shape; `resolveMarkup`→`sellingRange`→`resolvePublicRange`→`computeSavings` chain uses consistent field names. API maps UI unions (`kraft/white`,`plain/custom`) to Prisma enums (`KRAFT/WHITE`,`PLAIN/PRINTED`) in one place (Task 6 Step 3/5).
