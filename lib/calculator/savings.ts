export interface SavingsInput { currentPrice: number; monthlyVolume: number; priceRange: { minEur: number; maxEur: number }; }
export interface SavingsResult { annualVolume: number; savingsPerBoxMin: number; savingsPerBoxMax: number; savingsPctMin: number; savingsPctMax: number; yearlySavingsMin: number; yearlySavingsMax: number; }
const nn = (v: number) => Math.max(0, v);
export function computeSavings({ currentPrice, monthlyVolume, priceRange }: SavingsInput): SavingsResult {
  const annualVolume = monthlyVolume * 12;
  const perBoxMax = nn(currentPrice - priceRange.minEur);
  const perBoxMin = nn(currentPrice - priceRange.maxEur);
  return { annualVolume, savingsPerBoxMin: perBoxMin, savingsPerBoxMax: perBoxMax,
    savingsPctMin: currentPrice > 0 ? (perBoxMin / currentPrice) * 100 : 0,
    savingsPctMax: currentPrice > 0 ? (perBoxMax / currentPrice) * 100 : 0,
    yearlySavingsMin: perBoxMin * annualVolume, yearlySavingsMax: perBoxMax * annualVolume };
}
