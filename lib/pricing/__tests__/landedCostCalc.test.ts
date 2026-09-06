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
