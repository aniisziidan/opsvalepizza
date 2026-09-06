# Landed-Cost Calculator + Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin tool that itemizes shipment expenses (free label + stage + min/max EUR), derives per-box landed cost from a single shipment quantity, and saves each calculation as a versioned, audit-logged record with its own log.

**Architecture:** A pure compute + Zod-schema module (`lib/pricing/landedCostCalc.ts`) shared by client (live preview) and server (authoritative recompute). A new versioned Prisma model `LandedCostCalc` (header + `lines` JSON) mirrors the existing `LandedCost`/`PricingRule` versioning + `PricingAuditLog` pattern. Server actions (`app/admin/landed-cost/actions.ts`) create/version/toggle records; a server-component page renders a client builder + log component; a new nav item links to it.

**Tech Stack:** Next.js 15 (App Router, server actions), React 19, Prisma 6 + PostgreSQL, Zod, Vitest (node env), Tailwind.

**Design spec:** `docs/superpowers/specs/2026-09-06-landed-cost-calculator-design.md`

---

## File Structure

- **Create** `lib/pricing/landedCostCalc.ts` — `STAGES`, `Stage`, `CalcLine`, `LandedCalcResult`, `computeLandedCalc()`, and Zod schemas (`calcLineSchema`, `createLandedCalcSchema`, `updateLandedCalcSchema`). Pure; no `'use server'`. Imported by client, server action, and tests.
- **Create** `lib/pricing/__tests__/landedCostCalc.test.ts` — unit tests for compute + schemas.
- **Modify** `prisma/schema.prisma` — add `LandedCostCalc` model, `LANDED_COST_CALC` enum value, back-relations on `Country`/`BoxConfig`/`AdminUser`.
- **Create** `prisma/migrations/<timestamp>_landed_cost_calc/migration.sql` — via `prisma migrate dev`.
- **Create** `app/admin/landed-cost/actions.ts` — `createLandedCalc`, `updateLandedCalc`, `toggleLandedCalcActive`.
- **Modify** `lib/admin/queries.ts` — add `LandedCalcRow` type + `getLandedCalcs()` and `getLandedCalcHistory()`.
- **Create** `app/admin/landed-cost/page.tsx` — server component that loads data and renders the client component.
- **Create** `components/admin/LandedCostCalculator.tsx` — client builder + log UI.
- **Modify** `components/admin/SideNavBar.tsx` — add the "Landed Cost" nav item.

---

## Task 1: Pure compute module + Zod schemas

**Files:**
- Create: `lib/pricing/landedCostCalc.ts`
- Test: `lib/pricing/__tests__/landedCostCalc.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/pricing/__tests__/landedCostCalc.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  computeLandedCalc,
  createLandedCalcSchema,
  calcLineSchema,
  type CalcLine,
} from '../landedCostCalc';

const lines: CalcLine[] = [
  { label: 'Factory loading', stage: 'ORIGIN', minEur: 100, maxEur: 100 },
  { label: 'Ocean freight', stage: 'FREIGHT', minEur: 1265, maxEur: 1265 },
  { label: 'Insurance', stage: 'FREIGHT', minEur: 44, maxEur: 59 },
  { label: 'Destination THC', stage: 'DESTINATION', minEur: 300, maxEur: 300 },
  { label: 'Banking/FX', stage: 'FINANCIAL', minEur: 150, maxEur: 150 },
];

describe('computeLandedCalc', () => {
  it('sums stage subtotals across min and max', () => {
    const r = computeLandedCalc(lines, 100000);
    expect(r.stageSubtotals.ORIGIN).toEqual({ min: 100, max: 100 });
    expect(r.stageSubtotals.FREIGHT).toEqual({ min: 1309, max: 1324 });
    expect(r.stageSubtotals.DESTINATION).toEqual({ min: 300, max: 300 });
    expect(r.stageSubtotals.FINANCIAL).toEqual({ min: 150, max: 150 });
  });

  it('sums the shipment totals and derives per-box by dividing by shipment qty', () => {
    const r = computeLandedCalc(lines, 100000);
    expect(r.shipmentMin).toBe(1859);
    expect(r.shipmentMax).toBe(1874);
    expect(r.perBoxMin).toBeCloseTo(0.01859, 6);
    expect(r.perBoxMax).toBeCloseTo(0.01874, 6);
  });

  it('returns zeroed stage subtotals and totals for no lines', () => {
    const r = computeLandedCalc([], 100000);
    expect(r.shipmentMin).toBe(0);
    expect(r.shipmentMax).toBe(0);
    expect(r.perBoxMin).toBe(0);
    expect(r.stageSubtotals.ORIGIN).toEqual({ min: 0, max: 0 });
  });

  it('never divides by zero when shipment qty is 0', () => {
    const r = computeLandedCalc(lines, 0);
    expect(Number.isFinite(r.perBoxMin)).toBe(true);
    expect(Number.isFinite(r.perBoxMax)).toBe(true);
  });
});

describe('calcLineSchema', () => {
  it('rejects a line where max is less than min', () => {
    const res = calcLineSchema.safeParse({ label: 'x', stage: 'ORIGIN', minEur: 10, maxEur: 5 });
    expect(res.success).toBe(false);
  });
  it('rejects an empty label', () => {
    const res = calcLineSchema.safeParse({ label: '  ', stage: 'ORIGIN', minEur: 1, maxEur: 1 });
    expect(res.success).toBe(false);
  });
  it('rejects an unknown stage', () => {
    const res = calcLineSchema.safeParse({ label: 'x', stage: 'NOPE', minEur: 1, maxEur: 1 });
    expect(res.success).toBe(false);
  });
});

describe('createLandedCalcSchema', () => {
  const valid = {
    title: 'EG → IT container',
    countryId: 'c1',
    boxConfigId: 'b1',
    shipmentQty: 100000,
    lines: [{ label: 'Ocean freight', stage: 'FREIGHT', minEur: 1265, maxEur: 1265 }],
  };
  it('accepts a valid payload', () => {
    expect(createLandedCalcSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects an empty line list', () => {
    expect(createLandedCalcSchema.safeParse({ ...valid, lines: [] }).success).toBe(false);
  });
  it('rejects a non-positive shipment quantity', () => {
    expect(createLandedCalcSchema.safeParse({ ...valid, shipmentQty: 0 }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- landedCostCalc`
Expected: FAIL — cannot resolve `../landedCostCalc`.

- [ ] **Step 3: Write the module**

Create `lib/pricing/landedCostCalc.ts`:

```ts
import { z } from 'zod';

export const STAGES = ['ORIGIN', 'FREIGHT', 'DESTINATION', 'FINANCIAL'] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  ORIGIN: 'Origin',
  FREIGHT: 'Ocean / Freight',
  DESTINATION: 'Destination',
  FINANCIAL: 'Financial / Other',
};

export interface CalcLine {
  label: string;
  stage: Stage;
  minEur: number;
  maxEur: number;
}

export interface LandedCalcResult {
  stageSubtotals: Record<Stage, { min: number; max: number }>;
  shipmentMin: number;
  shipmentMax: number;
  perBoxMin: number;
  perBoxMax: number;
}

/**
 * Sums line items into per-stage subtotals and shipment totals, then derives the
 * per-box landed cost by dividing the shipment totals by the shipment quantity.
 * Pure: reused by the client (live preview) and the server (authoritative recompute).
 */
export function computeLandedCalc(lines: CalcLine[], shipmentQty: number): LandedCalcResult {
  const stageSubtotals: Record<Stage, { min: number; max: number }> = {
    ORIGIN: { min: 0, max: 0 },
    FREIGHT: { min: 0, max: 0 },
    DESTINATION: { min: 0, max: 0 },
    FINANCIAL: { min: 0, max: 0 },
  };
  let shipmentMin = 0;
  let shipmentMax = 0;
  for (const line of lines) {
    stageSubtotals[line.stage].min += line.minEur;
    stageSubtotals[line.stage].max += line.maxEur;
    shipmentMin += line.minEur;
    shipmentMax += line.maxEur;
  }
  const divisor = shipmentQty > 0 ? shipmentQty : 1;
  return {
    stageSubtotals,
    shipmentMin,
    shipmentMax,
    perBoxMin: shipmentMin / divisor,
    perBoxMax: shipmentMax / divisor,
  };
}

export const calcLineSchema = z
  .object({
    label: z.string().trim().min(1, 'Label is required'),
    stage: z.enum(STAGES),
    minEur: z.number().min(0, 'Min must be 0 or greater'),
    maxEur: z.number().min(0, 'Max must be 0 or greater'),
  })
  .refine((d) => d.maxEur >= d.minEur, {
    message: 'Max must be greater than or equal to min',
    path: ['maxEur'],
  });

export const createLandedCalcSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  countryId: z.string().min(1, 'Country is required'),
  boxConfigId: z.string().min(1, 'Box configuration is required'),
  shipmentQty: z.number().int().positive('Shipment quantity must be greater than 0'),
  lines: z.array(calcLineSchema).min(1, 'Add at least one expense line'),
});

export const updateLandedCalcSchema = createLandedCalcSchema.extend({
  id: z.string().min(1, 'Record id is required'),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- landedCostCalc`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/landedCostCalc.ts lib/pricing/__tests__/landedCostCalc.test.ts
git commit -m "feat(pricing): pure landed-cost calc module + schemas"
```

---

## Task 2: Prisma model, enum value, relations + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the enum value**

In `prisma/schema.prisma`, extend `PricingEntityType` (currently lines ~141-146):

```prisma
enum PricingEntityType {
  LANDED_COST
  PRICING_RULE
  PUBLIC_PRICE_RANGE
  LOGISTICS_COST
  LANDED_COST_CALC
}
```

- [ ] **Step 2: Add back-relations on existing models**

Add to `model AdminUser` (after `pricingAuditLogs`):

```prisma
  landedCostCalcs   LandedCostCalc[]
```

Add to `model Country` (after `logisticsCosts`):

```prisma
  landedCostCalcs LandedCostCalc[]
```

Add to `model BoxConfig` (after `pricingRules`):

```prisma
  landedCostCalcs LandedCostCalc[]
```

- [ ] **Step 3: Add the new model**

Append to `prisma/schema.prisma`:

```prisma
model LandedCostCalc {
  id             String     @id @default(cuid())
  groupId        String     @default(cuid())
  title          String
  countryId      String
  country        Country    @relation(fields: [countryId], references: [id])
  boxConfigId    String
  boxConfig      BoxConfig  @relation(fields: [boxConfigId], references: [id])
  shipmentQty    Int
  lines          Json
  shipmentMinEur Decimal    @db.Decimal(12, 2)
  shipmentMaxEur Decimal    @db.Decimal(12, 2)
  perBoxMinEur   Decimal    @db.Decimal(10, 4)
  perBoxMaxEur   Decimal    @db.Decimal(10, 4)
  active         Boolean    @default(true)
  effectiveFrom  DateTime   @default(now())
  effectiveTo    DateTime?
  authorId       String?
  author         AdminUser? @relation(fields: [authorId], references: [id])
  createdAt      DateTime   @default(now())

  @@index([groupId])
  @@index([countryId])
  @@index([boxConfigId])
  @@index([active])
}
```

- [ ] **Step 4: Create the migration and regenerate the client**

Run: `npx prisma migrate dev --name landed_cost_calc`
Expected: creates `prisma/migrations/<timestamp>_landed_cost_calc/migration.sql` and regenerates the Prisma client with `LandedCostCalc`. (Requires a reachable dev `DATABASE_URL`.)

If no dev DB is reachable, instead run `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma` is NOT sufficient — the migration must be generated against the prior migration state. Use `npx prisma migrate dev` against a local Postgres. Then `npx prisma generate`.

- [ ] **Step 5: Verify types compile**

Run: `npm run typecheck`
Expected: PASS (Prisma client now exports `LandedCostCalc` and the new enum value).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): LandedCostCalc model + LANDED_COST_CALC audit enum"
```

---

## Task 3: Server actions

**Files:**
- Create: `app/admin/landed-cost/actions.ts`

- [ ] **Step 1: Write the actions**

Create `app/admin/landed-cost/actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { Prisma } from '@prisma/client';
import {
  computeLandedCalc,
  createLandedCalcSchema,
  updateLandedCalcSchema,
  type CalcLine,
} from '@/lib/pricing/landedCostCalc';

function isStaleActionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : '';
  return (
    message.includes('failed-to-find-server-action') ||
    message.includes('was not found on the server')
  );
}

/** Freezes computed totals for a version row from its validated inputs. */
function totalsForRow(lines: CalcLine[], shipmentQty: number) {
  const r = computeLandedCalc(lines, shipmentQty);
  return {
    shipmentMinEur: new Prisma.Decimal(r.shipmentMin.toFixed(2)),
    shipmentMaxEur: new Prisma.Decimal(r.shipmentMax.toFixed(2)),
    perBoxMinEur: new Prisma.Decimal(r.perBoxMin.toFixed(4)),
    perBoxMaxEur: new Prisma.Decimal(r.perBoxMax.toFixed(4)),
  };
}

/** Creates a brand-new calculation (fresh groupId). */
export async function createLandedCalc(rawData: unknown) {
  try {
    const admin = await requireAdmin();
    const data = createLandedCalcSchema.parse(rawData);
    const totals = totalsForRow(data.lines, data.shipmentQty);

    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.landedCostCalc.create({
        data: {
          title: data.title,
          countryId: data.countryId,
          boxConfigId: data.boxConfigId,
          shipmentQty: data.shipmentQty,
          lines: data.lines as unknown as Prisma.InputJsonValue,
          ...totals,
          authorId: admin.id,
          active: true,
        },
      });
      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id,
          entityType: 'LANDED_COST_CALC',
          entityId: created.id,
          action: 'CREATE',
          oldValues: Prisma.JsonNull,
          newValues: {
            title: created.title,
            groupId: created.groupId,
            shipmentQty: created.shipmentQty,
            shipmentMinEur: created.shipmentMinEur.toString(),
            shipmentMaxEur: created.shipmentMaxEur.toString(),
          },
        },
      });
      return created;
    });

    revalidatePath('/admin/landed-cost');
    return { success: true, id: record.id };
  } catch (err) {
    if (isStaleActionError(err)) throw err;
    if (err instanceof Error && err.message.startsWith('UNAUTHORIZED')) throw err;
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message ?? 'Invalid input'
        : err instanceof Error
          ? err.message
          : 'Failed to save calculation';
    return { success: false, error: message };
  }
}

/** Version-bumps an existing calculation within its groupId lineage. */
export async function updateLandedCalc(rawData: unknown) {
  try {
    const admin = await requireAdmin();
    const data = updateLandedCalcSchema.parse(rawData);
    const totals = totalsForRow(data.lines, data.shipmentQty);

    const record = await prisma.$transaction(async (tx) => {
      const existing = await tx.landedCostCalc.findUnique({ where: { id: data.id } });
      if (!existing) throw new Error('Calculation not found');

      const now = new Date();
      await tx.landedCostCalc.update({
        where: { id: existing.id },
        data: { active: false, effectiveTo: now },
      });

      const created = await tx.landedCostCalc.create({
        data: {
          groupId: existing.groupId,
          title: data.title,
          countryId: data.countryId,
          boxConfigId: data.boxConfigId,
          shipmentQty: data.shipmentQty,
          lines: data.lines as unknown as Prisma.InputJsonValue,
          ...totals,
          authorId: admin.id,
          active: true,
          effectiveFrom: now,
        },
      });

      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id,
          entityType: 'LANDED_COST_CALC',
          entityId: created.id,
          action: 'VERSION_UPDATE',
          oldValues: {
            shipmentMinEur: existing.shipmentMinEur.toString(),
            shipmentMaxEur: existing.shipmentMaxEur.toString(),
            effectiveFrom: existing.effectiveFrom.toISOString(),
          },
          newValues: {
            title: created.title,
            groupId: created.groupId,
            shipmentMinEur: created.shipmentMinEur.toString(),
            shipmentMaxEur: created.shipmentMaxEur.toString(),
          },
        },
      });
      return created;
    });

    revalidatePath('/admin/landed-cost');
    return { success: true, id: record.id };
  } catch (err) {
    if (isStaleActionError(err)) throw err;
    if (err instanceof Error && err.message.startsWith('UNAUTHORIZED')) throw err;
    const message =
      err instanceof z.ZodError
        ? err.issues[0]?.message ?? 'Invalid input'
        : err instanceof Error
          ? err.message
          : 'Failed to update calculation';
    return { success: false, error: message };
  }
}

/** Archives or restores a calculation version. */
export async function toggleLandedCalcActive(id: string, active: boolean) {
  try {
    const admin = await requireAdmin();
    await prisma.$transaction(async (tx) => {
      const record = await tx.landedCostCalc.findUnique({ where: { id } });
      if (!record) throw new Error('Calculation not found');
      const now = new Date();
      await tx.landedCostCalc.update({
        where: { id },
        data: { active, effectiveTo: active ? null : now },
      });
      await tx.pricingAuditLog.create({
        data: {
          authorId: admin.id,
          entityType: 'LANDED_COST_CALC',
          entityId: id,
          action: 'TOGGLE_ACTIVE',
          oldValues: { active: !active },
          newValues: { active },
        },
      });
    });
    revalidatePath('/admin/landed-cost');
    return { success: true };
  } catch (err) {
    if (isStaleActionError(err)) throw err;
    if (err instanceof Error && err.message.startsWith('UNAUTHORIZED')) throw err;
    const message = err instanceof Error ? err.message : 'Failed to change status';
    return { success: false, error: message };
  }
}
```

Note: add `import { z } from 'zod';` at the top alongside the other imports (used in the catch blocks).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/admin/landed-cost/actions.ts
git commit -m "feat(landed-cost): create/version/toggle server actions"
```

---

## Task 4: Query functions + DTO type

**Files:**
- Modify: `lib/admin/queries.ts`

- [ ] **Step 1: Add the row type and queries**

At the top of `lib/admin/queries.ts`, ensure this import exists (add if missing):

```ts
import type { CalcLine } from '@/lib/pricing/landedCostCalc';
```

Add near the other exported row types (e.g. after `LogisticsRow`):

```ts
export interface LandedCalcRow {
  id: string;
  groupId: string;
  title: string;
  countryCode: string;
  countryName: string;
  boxConfigId: string;
  boxLabel: string;
  shipmentQty: number;
  lines: CalcLine[];
  shipmentMinEur: string;
  shipmentMaxEur: string;
  perBoxMinEur: string;
  perBoxMaxEur: string;
  active: boolean;
  effectiveFrom: string;
  authorName: string | null;
}

function mapLandedCalcRow(r: {
  id: string;
  groupId: string;
  title: string;
  country: { code: string; name: string };
  boxConfig: { id: string; sizeLabel: string };
  shipmentQty: number;
  lines: unknown;
  shipmentMinEur: { toString(): string };
  shipmentMaxEur: { toString(): string };
  perBoxMinEur: { toString(): string };
  perBoxMaxEur: { toString(): string };
  active: boolean;
  effectiveFrom: Date;
  author: { name: string } | null;
}): LandedCalcRow {
  return {
    id: r.id,
    groupId: r.groupId,
    title: r.title,
    countryCode: r.country.code,
    countryName: r.country.name,
    boxConfigId: r.boxConfig.id,
    boxLabel: r.boxConfig.sizeLabel,
    shipmentQty: r.shipmentQty,
    lines: (Array.isArray(r.lines) ? r.lines : []) as CalcLine[],
    shipmentMinEur: r.shipmentMinEur.toString(),
    shipmentMaxEur: r.shipmentMaxEur.toString(),
    perBoxMinEur: r.perBoxMinEur.toString(),
    perBoxMaxEur: r.perBoxMaxEur.toString(),
    active: r.active,
    effectiveFrom: r.effectiveFrom.toISOString(),
    authorName: r.author?.name ?? null,
  };
}

/** Active landed-cost calculations for the log list (latest version per group). */
export async function getLandedCalcs(): Promise<LandedCalcRow[]> {
  const records = await prisma.landedCostCalc.findMany({
    where: { active: true },
    include: { country: true, boxConfig: true, author: true },
    orderBy: { effectiveFrom: 'desc' },
  });
  return records.map(mapLandedCalcRow);
}

/** Full version history (active + retired) for one calculation lineage. */
export async function getLandedCalcHistory(groupId: string): Promise<LandedCalcRow[]> {
  const records = await prisma.landedCostCalc.findMany({
    where: { groupId },
    include: { country: true, boxConfig: true, author: true },
    orderBy: { effectiveFrom: 'desc' },
  });
  return records.map(mapLandedCalcRow);
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/admin/queries.ts
git commit -m "feat(landed-cost): queries + LandedCalcRow DTO"
```

---

## Task 5: Page + navigation

**Files:**
- Create: `app/admin/landed-cost/page.tsx`
- Modify: `components/admin/SideNavBar.tsx`

- [ ] **Step 1: Create the page**

Create `app/admin/landed-cost/page.tsx`:

```tsx
import { LandedCostCalculator } from '@/components/admin/LandedCostCalculator';
import { getLandedCalcs, getCountries, getBoxConfigs } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

export default async function AdminLandedCostPage() {
  const [calcs, countries, boxConfigs] = await Promise.all([
    getLandedCalcs(),
    getCountries(),
    getBoxConfigs(),
  ]);

  return (
    <LandedCostCalculator calcs={calcs} countries={countries} boxConfigs={boxConfigs} />
  );
}
```

- [ ] **Step 2: Add the nav item**

In `components/admin/SideNavBar.tsx`, insert into `menuItems` immediately after the `logistics` entry (line ~51):

```tsx
    { id: 'landed-cost', label: 'Landed Cost', icon: 'calculate', href: '/admin/landed-cost' },
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: FAIL — `LandedCostCalculator` does not exist yet (created in Task 6). This is expected; proceed to Task 6 before committing.

- [ ] **Step 4: Commit (after Task 6 typecheck passes)**

Deferred — commit page + nav together with Task 6 so the tree stays buildable.

---

## Task 6: Client builder + log component

**Files:**
- Create: `components/admin/LandedCostCalculator.tsx`

- [ ] **Step 1: Create the component**

Create `components/admin/LandedCostCalculator.tsx`:

```tsx
'use client';

import React, { useMemo, useState, useTransition } from 'react';
import type { CountryOption, BoxConfigOption, LandedCalcRow } from '@/lib/admin/queries';
import {
  STAGES,
  STAGE_LABELS,
  computeLandedCalc,
  type CalcLine,
  type Stage,
} from '@/lib/pricing/landedCostCalc';
import {
  createLandedCalc,
  updateLandedCalc,
  toggleLandedCalcActive,
} from '@/app/admin/landed-cost/actions';

interface Props {
  calcs: LandedCalcRow[];
  countries: CountryOption[];
  boxConfigs: BoxConfigOption[];
}

interface DraftLine {
  label: string;
  stage: Stage;
  minEur: string;
  maxEur: string;
}

const eur2 = (n: number) => `€${n.toFixed(2)}`;
const eur4 = (n: number) => `€${n.toFixed(4)}`;
const rangeStr = (min: number, max: number, fmt: (n: number) => string) =>
  min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;

const emptyLine = (): DraftLine => ({ label: '', stage: 'ORIGIN', minEur: '0', maxEur: '0' });

function toCalcLines(draft: DraftLine[]): CalcLine[] {
  return draft.map((d) => ({
    label: d.label.trim(),
    stage: d.stage,
    minEur: Number(d.minEur) || 0,
    maxEur: Number(d.maxEur) || 0,
  }));
}

export const LandedCostCalculator: React.FC<Props> = ({ calcs, countries, boxConfigs }) => {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [countryId, setCountryId] = useState(countries[0]?.id || '');
  const [boxConfigId, setBoxConfigId] = useState(boxConfigs[0]?.id || '');
  const [shipmentQty, setShipmentQty] = useState('100000');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const preview = useMemo(
    () => computeLandedCalc(toCalcLines(lines), Number(shipmentQty) || 0),
    [lines, shipmentQty]
  );

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCountryId(countries[0]?.id || '');
    setBoxConfigId(boxConfigs[0]?.id || '');
    setShipmentQty('100000');
    setLines([emptyLine()]);
  };

  const loadForEdit = (row: LandedCalcRow) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setEditingId(row.id);
    setTitle(row.title);
    setCountryId(countries.find((c) => c.code === row.countryCode)?.id || countries[0]?.id || '');
    setBoxConfigId(row.boxConfigId);
    setShipmentQty(String(row.shipmentQty));
    setLines(
      row.lines.length
        ? row.lines.map((l) => ({
            label: l.label,
            stage: l.stage,
            minEur: String(l.minEur),
            maxEur: String(l.maxEur),
          }))
        : [emptyLine()]
    );
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateLine = (i: number, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (i: number) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const payload = {
      title,
      countryId,
      boxConfigId,
      shipmentQty: Number(shipmentQty) || 0,
      lines: toCalcLines(lines),
    };
    startTransition(async () => {
      try {
        const res = editingId
          ? await updateLandedCalc({ ...payload, id: editingId })
          : await createLandedCalc(payload);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to save calculation');
          return;
        }
        setSuccessMsg(editingId ? 'Calculation saved as a new version.' : 'Calculation saved to the log.');
        resetForm();
      } catch (err) {
        if (err instanceof Error && err.message.includes('server')) {
          window.location.reload();
          return;
        }
        setErrorMsg(err instanceof Error ? err.message : 'Failed to save calculation');
      }
    });
  };

  const handleToggle = (id: string, active: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      try {
        const res = await toggleLandedCalcActive(id, !active);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to change status');
          return;
        }
        setSuccessMsg(`Calculation ${!active ? 'restored' : 'archived'}.`);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to change status');
      }
    });
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 space-y-6 bg-[#f8f9ff]">
      {/* Header */}
      <div className="border-b border-[#c5c6ce] pb-6">
        <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
          Sourcing &amp; Import Costing
        </span>
        <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
          Landed-Cost Calculator
        </h1>
        <p className="font-body text-sm text-[#44474d]">
          Itemize a shipment&apos;s expenses to derive the per-box landed cost, and save each calculation to the log.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-[#ffdad6] border border-[#ba1a1a] text-[#93000a] rounded-lg font-mono-data text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-400 text-emerald-800 rounded-lg font-mono-data text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Builder */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-2 bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm space-y-5 font-mono-data text-xs"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-lg font-bold text-[#041632]">
              {editingId ? 'Edit Calculation (saves as new version)' : 'New Calculation'}
            </h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-[#041632] hover:text-[#e77114] underline">
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-gray-700 mb-1 font-semibold">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Alexandria → Milan container (Q3)"
                className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">Destination Country</label>
              <select
                value={countryId}
                onChange={(e) => setCountryId(e.target.value)}
                className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg bg-white focus:ring-2 focus:ring-[#041632]"
              >
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">Box Configuration</label>
              <select
                value={boxConfigId}
                onChange={(e) => setBoxConfigId(e.target.value)}
                className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg bg-white focus:ring-2 focus:ring-[#041632]"
              >
                {boxConfigs.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.sizeLabel} · {b.material} · {b.print}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">Boxes per Shipment</label>
              <input
                type="number"
                min="1"
                step="1"
                value={shipmentQty}
                onChange={(e) => setShipmentQty(e.target.value)}
                className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-gray-700 font-semibold">Expense Lines</label>
              <button type="button" onClick={addLine} className="text-[#041632] hover:text-[#e77114] flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-sm">add_circle</span> Add line
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={l.label}
                    placeholder="e.g. Ocean freight"
                    onChange={(e) => updateLine(i, { label: e.target.value })}
                    className="col-span-5 h-9 px-2 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
                  />
                  <select
                    value={l.stage}
                    onChange={(e) => updateLine(i, { stage: e.target.value as Stage })}
                    className="col-span-3 h-9 px-2 border border-[#c5c6ce] rounded-lg bg-white focus:ring-2 focus:ring-[#041632]"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={l.minEur}
                    onChange={(e) => updateLine(i, { minEur: e.target.value })}
                    className="col-span-1 h-9 px-2 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
                    title="Min €"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={l.maxEur}
                    onChange={(e) => updateLine(i, { maxEur: e.target.value })}
                    className="col-span-2 h-9 px-2 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
                    title="Max €"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="col-span-1 text-gray-400 hover:text-[#ba1a1a] flex justify-center"
                    title="Remove line"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#c5c6ce]">
            <button
              type="submit"
              disabled={isPending}
              className="bg-[#041632] hover:bg-[#1b2b48] text-white px-5 py-2 rounded-lg font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : editingId ? (
                'Save New Version'
              ) : (
                'Save Calculation'
              )}
            </button>
          </div>
        </form>

        {/* Live totals */}
        <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm space-y-3 font-mono-data text-xs h-fit sticky top-6">
          <h2 className="font-headline text-lg font-bold text-[#041632]">Live Landed Cost</h2>
          {STAGES.map((s) => {
            const sub = preview.stageSubtotals[s];
            return (
              <div key={s} className="flex justify-between">
                <span className="text-[#75777e]">{STAGE_LABELS[s]}</span>
                <span className="font-bold text-[#041632]">{rangeStr(sub.min, sub.max, eur2)}</span>
              </div>
            );
          })}
          <div className="flex justify-between pt-2 border-t border-[#c5c6ce]/60">
            <span className="text-[#75777e]">Shipment total</span>
            <span className="font-bold text-[#e77114]">{rangeStr(preview.shipmentMin, preview.shipmentMax, eur2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#75777e]">Landed cost / box</span>
            <span className="font-bold text-[#e77114]">{rangeStr(preview.perBoxMin, preview.perBoxMax, eur4)}</span>
          </div>
        </div>
      </div>

      {/* Log */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#c5c6ce]">
          <h2 className="font-headline text-lg font-bold text-[#041632]">Landed-Cost Log</h2>
        </div>
        {calcs.length === 0 ? (
          <div className="p-12 text-center text-[#75777e] font-mono-data text-sm">
            No saved calculations yet.
          </div>
        ) : (
          <table className="w-full font-mono-data text-xs">
            <thead className="bg-[#f8f9ff] text-[#75777e] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="text-left px-6 py-3">Title</th>
                <th className="text-left px-4 py-3">Country</th>
                <th className="text-left px-4 py-3">Box</th>
                <th className="text-right px-4 py-3">€/box</th>
                <th className="text-left px-4 py-3">Updated</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {calcs.map((c) => (
                <tr key={c.id} className="border-t border-[#c5c6ce]/50 hover:bg-[#f8f9ff]">
                  <td className="px-6 py-3 font-bold text-[#041632]">{c.title}</td>
                  <td className="px-4 py-3">{c.countryName} ({c.countryCode})</td>
                  <td className="px-4 py-3">{c.boxLabel}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#e77114]">
                    {rangeStr(Number(c.perBoxMinEur), Number(c.perBoxMaxEur), eur4)}
                  </td>
                  <td className="px-4 py-3 text-[#75777e]">{new Date(c.effectiveFrom).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-right space-x-3">
                    <button onClick={() => loadForEdit(c)} className="text-[#041632] hover:text-[#e77114] font-semibold">
                      Edit
                    </button>
                    <button onClick={() => handleToggle(c.id, c.active)} disabled={isPending} className="text-[#041632] hover:text-[#ba1a1a] font-semibold">
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (page from Task 5 now resolves the component; `CountryOption` and `BoxConfigOption` are already exported from `lib/admin/queries.ts`).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS (no unused vars / unescaped entities — note the `&apos;` and `&amp;` used above).

- [ ] **Step 4: Commit**

```bash
git add components/admin/LandedCostCalculator.tsx app/admin/landed-cost/page.tsx components/admin/SideNavBar.tsx
git commit -m "feat(landed-cost): builder + log UI, page, and nav entry"
```

---

## Task 7: Full verification gate

**Files:** none (verification only)

- [ ] **Step 1: Run the unit tests**

Run: `npm test`
Expected: PASS, including the new `landedCostCalc` suite.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: PASS; `/admin/landed-cost` appears in the route manifest.

- [ ] **Step 5: Manual smoke (optional, requires dev DB)**

Run: `npm run dev`, sign in to `/admin`, open **Landed Cost**, add the reference-model lines, confirm the live €/box range matches, save, confirm the row appears in the log, edit it (new version), archive it.

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "chore(landed-cost): verification fixes"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 2), pure compute + ranges + stage subtotals (Task 1), per-box from single shipment qty (Task 1/3), versioned editable log + audit (Task 3), queries (Task 4), builder + log UI + nav (Task 5/6), EUR-only & flat amounts (schema in Task 1). Designed-for-later push and out-of-scope items are intentionally not built.
- **Type consistency:** `CalcLine`/`Stage`/`STAGES`/`STAGE_LABELS`/`computeLandedCalc` defined in Task 1 and imported unchanged in Tasks 3/4/6. `LandedCalcRow` defined in Task 4 and consumed in Task 6. Actions `createLandedCalc`/`updateLandedCalc`/`toggleLandedCalcActive` defined in Task 3 and called in Task 6.
- **Ordering caveat:** Task 5 intentionally does not typecheck-pass on its own (depends on Task 6); the two are committed together. This is called out in Task 5 Step 3-4.
