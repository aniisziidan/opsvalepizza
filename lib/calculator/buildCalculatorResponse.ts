import type { PublicRangeResult } from '@/lib/pricing/publicRange';
import type { SavingsResult } from '@/lib/calculator/savings';

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;
const round2 = (n: number) => Math.round(n * 1e2) / 1e2;
const round1 = (n: number) => Math.round(n * 10) / 10;

export interface CalculatorResponse {
  available: true;
  priceRange: { minEur: number; maxEur: number };
  savings: {
    perBoxMin: number;
    perBoxMax: number;
    pctMin: number;
    pctMax: number;
    monthlyMin: number;
    monthlyMax: number;
    yearlyMin: number;
    yearlyMax: number;
    annualVolume: number;
  };
}

/**
 * Assemble the PUBLIC-ONLY calculator response. This helper is the single place
 * that shapes the API payload, so the security guarantee (no landed cost, markup,
 * or internal cost leaks to the client) is enforced by a DB-free unit test.
 */
export function buildCalculatorResponse(
  range: PublicRangeResult,
  savings: SavingsResult,
): CalculatorResponse {
  return {
    available: true,
    priceRange: { minEur: round4(range.minEur), maxEur: round4(range.maxEur) },
    savings: {
      perBoxMin: round4(savings.savingsPerBoxMin),
      perBoxMax: round4(savings.savingsPerBoxMax),
      pctMin: round1(savings.savingsPctMin),
      pctMax: round1(savings.savingsPctMax),
      monthlyMin: round2(savings.monthlySavingsMin),
      monthlyMax: round2(savings.monthlySavingsMax),
      yearlyMin: round2(savings.yearlySavingsMin),
      yearlyMax: round2(savings.yearlySavingsMax),
      annualVolume: savings.annualVolume,
    },
  };
}
