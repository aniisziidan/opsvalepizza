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
