import { describe, it, expect } from 'vitest';
import { buildCalculatorResponse } from '../buildCalculatorResponse';
import type { PublicRangeResult } from '@/lib/pricing/publicRange';
import type { SavingsResult } from '@/lib/calculator/savings';

const range: PublicRangeResult = {
  available: true,
  minEur: 0.256789,
  maxEur: 0.301234,
  breakdown: null,
  markupMin: 0,
  markupMax: 0,
  source: 'APPROVED_RANGE',
};
const savings: SavingsResult = {
  annualVolume: 720000,
  savingsPerBoxMin: 0.048766,
  savingsPerBoxMax: 0.093211,
  savingsPctMin: 13.933142,
  savingsPctMax: 26.631714,
  yearlySavingsMin: 35111.52,
  yearlySavingsMax: 67111.92,
};

// Recursively collect every key name and every string value at any depth.
function walk(obj: unknown, keys: string[], strings: string[]): void {
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      keys.push(k);
      walk(v, keys, strings);
    }
  } else if (typeof obj === 'string') {
    strings.push(obj);
  }
}

describe('buildCalculatorResponse', () => {
  it('returns priceRange and savings correctly (rounded)', () => {
    const result = buildCalculatorResponse(range, savings);
    expect(result.available).toBe(true);
    expect(result.priceRange).toEqual({ minEur: 0.2568, maxEur: 0.3012 });
    expect(result.savings.perBoxMin).toBe(0.0488);
    expect(result.savings.perBoxMax).toBe(0.0932);
    expect(result.savings.pctMin).toBe(13.9);
    expect(result.savings.pctMax).toBe(26.6);
    expect(result.savings.yearlyMin).toBe(35111.52);
    expect(result.savings.yearlyMax).toBe(67111.92);
    expect(result.savings.annualVolume).toBe(720000);
  });

  it('never leaks landed cost, markup, or internal cost (keys or serialized values)', () => {
    const result = buildCalculatorResponse(range, savings);
    const forbidden = ['landed', 'markup', 'cost'];

    const serialized = JSON.stringify(result).toLowerCase();
    for (const term of forbidden) {
      expect(serialized).not.toContain(term);
    }

    const keys: string[] = [];
    const strings: string[] = [];
    walk(result, keys, strings);
    for (const term of forbidden) {
      expect(keys.some((k) => k.toLowerCase().includes(term))).toBe(false);
      expect(strings.some((s) => s.toLowerCase().includes(term))).toBe(false);
    }
  });
});
