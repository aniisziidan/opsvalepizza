export interface Markup { markupMin: number; markupMax: number; }
export interface PriceRange { minEur: number; maxEur: number; }
export function sellingRange(landedEur: number, m: Markup): PriceRange {
  if (!(landedEur > 0)) throw new Error('landed cost must be positive');
  const a = landedEur * (1 + m.markupMin);
  const b = landedEur * (1 + m.markupMax);
  return { minEur: Math.min(a, b), maxEur: Math.max(a, b) };
}
