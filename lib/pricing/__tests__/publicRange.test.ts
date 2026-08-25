import { describe, it, expect } from 'vitest';
import { resolvePublicRange, type PublicRangeInputs } from '../publicRange';
const base: PublicRangeInputs = {
  boxConfigId: 'b1', countryId: 'de', monthlyVolume: 20000, approvedRange: null,
  markupRules: [{ scope: 'GLOBAL', countryId: null, boxConfigId: null, markupMin: 0.2, markupMax: 0.3, active: true }],
  landedCosts: [{ boxConfigId: 'b1', countryId: 'de', qtyTierMin: 0, qtyTierMax: null, costEur: 0.18, active: true }],
};
describe('resolvePublicRange', () => {
  it('uses the approved/override range when present, ignoring internal cost', () => {
    const r = resolvePublicRange({ ...base, approvedRange: { minEur: 0.22, maxEur: 0.25 } });
    expect(r.available).toBe(true); expect(r.minEur).toBeCloseTo(0.22); expect(r.maxEur).toBeCloseTo(0.25);
  });
  it('computes from landed cost + markup when no approved range', () => {
    const r = resolvePublicRange(base);
    expect(r.available).toBe(true); expect(r.minEur).toBeCloseTo(0.18 * 1.2, 3); expect(r.maxEur).toBeCloseTo(0.18 * 1.3, 3);
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
