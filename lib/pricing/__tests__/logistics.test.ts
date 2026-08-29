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
