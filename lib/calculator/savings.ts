export interface SavingsInput { currentPrice: number; monthlyVolume: number; priceRange: { minEur: number; maxEur: number }; }
export interface SavingsResult {
  annualVolume: number;
  monthlyVolume: number;
  savingsPerBoxMin: number;
  savingsPerBoxMax: number;
  savingsPctMin: number;
  savingsPctMax: number;
  monthlySavingsMin: number;
  monthlySavingsMax: number;
  yearlySavingsMin: number;
  yearlySavingsMax: number;
}
const nn = (v: number) => Math.max(0, v);
export function computeSavings({ currentPrice, monthlyVolume, priceRange }: SavingsInput): SavingsResult {
  const annualVolume = monthlyVolume * 12;
  const perBoxMax = nn(currentPrice - priceRange.minEur);
  const perBoxMin = nn(currentPrice - priceRange.maxEur);
  return {
    annualVolume,
    monthlyVolume,
    savingsPerBoxMin: perBoxMin,
    savingsPerBoxMax: perBoxMax,
    savingsPctMin: currentPrice > 0 ? (perBoxMin / currentPrice) * 100 : 0,
    savingsPctMax: currentPrice > 0 ? (perBoxMax / currentPrice) * 100 : 0,
    monthlySavingsMin: perBoxMin * monthlyVolume,
    monthlySavingsMax: perBoxMax * monthlyVolume,
    yearlySavingsMin: perBoxMin * annualVolume,
    yearlySavingsMax: perBoxMax * annualVolume,
  };
}
