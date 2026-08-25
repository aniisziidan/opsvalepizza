import { describe, it, expect } from 'vitest';
import { sellingRange } from '../sellingRange';
describe('sellingRange', () => {
  it('computes range from landed cost and markup (spec §28)', () => {
    const r = sellingRange(0.18, { markupMin: 0.15, markupMax: 0.45 });
    expect(r.minEur).toBeCloseTo(0.207, 3); expect(r.maxEur).toBeCloseTo(0.261, 3);
  });
  it('returns min<=max even if markups equal', () => {
    const r = sellingRange(0.20, { markupMin: 0.30, markupMax: 0.30 });
    expect(r.minEur).toBeCloseTo(0.26, 3); expect(r.maxEur).toBeCloseTo(0.26, 3);
  });
  it('throws on non-positive landed cost', () => { expect(() => sellingRange(0, { markupMin: 0.2, markupMax: 0.3 })).toThrow(); });
});
