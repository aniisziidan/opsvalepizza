import { describe, it, expect } from 'vitest';
import { computeSavings } from '../savings';
describe('computeSavings', () => {
  const input = { currentPrice: 0.35, monthlyVolume: 20000, priceRange: { minEur: 0.21, maxEur: 0.26 } };
  it('savings per box uses the range (best vs worst)', () => {
    const r = computeSavings(input);
    expect(r.savingsPerBoxMax).toBeCloseTo(0.14, 4); expect(r.savingsPerBoxMin).toBeCloseTo(0.09, 4);
  });
  it('annual volume is monthly × 12', () => { expect(computeSavings(input).annualVolume).toBe(240000); });
  it('monthly savings = perBox × monthly', () => {
    const r = computeSavings(input);
    expect(r.monthlySavingsMax).toBeCloseTo(0.14 * 20000, 2);
    expect(r.monthlySavingsMin).toBeCloseTo(0.09 * 20000, 2);
  });
  it('yearly savings = perBox × monthly × 12', () => {
    const r = computeSavings(input);
    expect(r.yearlySavingsMax).toBeCloseTo(0.14 * 240000, 2); expect(r.yearlySavingsMin).toBeCloseTo(0.09 * 240000, 2);
  });
  it('savings percent is relative to current price', () => {
    const r = computeSavings(input); expect(r.savingsPctMax).toBeCloseTo((0.14 / 0.35) * 100, 2);
  });
  it('never returns negative savings (clamps at 0) when OpsVale is more expensive', () => {
    const r = computeSavings({ currentPrice: 0.20, monthlyVolume: 1000, priceRange: { minEur: 0.21, maxEur: 0.26 } });
    expect(r.savingsPerBoxMin).toBe(0); expect(r.yearlySavingsMin).toBe(0);
  });
});
