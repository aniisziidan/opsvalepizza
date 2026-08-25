import { resolveMarkup, type MarkupRule } from './resolveMarkup';
import { sellingRange } from './sellingRange';
export interface LandedCostRow { boxConfigId: string; countryId: string; qtyTierMin: number; qtyTierMax: number | null; costEur: number; active: boolean; }
export interface PublicRangeInputs { boxConfigId: string; countryId: string; monthlyVolume: number; approvedRange: { minEur: number; maxEur: number } | null; markupRules: MarkupRule[]; landedCosts: LandedCostRow[]; }
export interface PublicRangeResult { available: boolean; minEur: number; maxEur: number; }
export function resolvePublicRange(i: PublicRangeInputs): PublicRangeResult {
  if (i.approvedRange) return { available: true, minEur: i.approvedRange.minEur, maxEur: i.approvedRange.maxEur };
  const tier = i.landedCosts
    .filter((l) => l.active && l.boxConfigId === i.boxConfigId && l.countryId === i.countryId)
    .find((l) => i.monthlyVolume >= l.qtyTierMin && (l.qtyTierMax == null || i.monthlyVolume <= l.qtyTierMax));
  if (!tier) return { available: false, minEur: 0, maxEur: 0 };
  let markup;
  try { markup = resolveMarkup(i.markupRules, { countryId: i.countryId, boxConfigId: i.boxConfigId }); }
  catch { return { available: false, minEur: 0, maxEur: 0 }; }
  const range = sellingRange(tier.costEur, markup);
  return { available: true, minEur: range.minEur, maxEur: range.maxEur };
}
