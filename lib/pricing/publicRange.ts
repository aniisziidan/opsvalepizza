import { resolveMarkup, type MarkupRule } from './resolveMarkup';
import { sellingRange } from './sellingRange';
import { effectiveLandedCost, type Corridor, type LandedBreakdown } from './logistics';

export interface LandedCostRow { boxConfigId: string; countryId: string; qtyTierMin: number; qtyTierMax: number | null; costEur: number; active: boolean; }
export interface PublicRangeInputs {
  boxConfigId: string;
  countryId: string;
  monthlyVolume: number;
  approvedRange: { minEur: number; maxEur: number } | null;
  markupRules: MarkupRule[];
  landedCosts: LandedCostRow[];
  logistics?: Corridor | null;
}
export interface PublicRangeResult {
  available: boolean;
  minEur: number;
  maxEur: number;
  breakdown: LandedBreakdown | null;
  markupMin: number;
  markupMax: number;
  source: 'APPROVED_RANGE' | 'COMPUTED';
}

const UNAVAILABLE: PublicRangeResult = {
  available: false, minEur: 0, maxEur: 0, breakdown: null, markupMin: 0, markupMax: 0, source: 'COMPUTED',
};

export function resolvePublicRange(i: PublicRangeInputs): PublicRangeResult {
  if (i.approvedRange) {
    return {
      available: true,
      minEur: i.approvedRange.minEur,
      maxEur: i.approvedRange.maxEur,
      breakdown: null,
      markupMin: 0,
      markupMax: 0,
      source: 'APPROVED_RANGE',
    };
  }
  const tier = i.landedCosts
    .filter((l) => l.active && l.boxConfigId === i.boxConfigId && l.countryId === i.countryId)
    .find((l) => i.monthlyVolume >= l.qtyTierMin && (l.qtyTierMax == null || i.monthlyVolume <= l.qtyTierMax));
  if (!tier) return UNAVAILABLE;

  const breakdown = effectiveLandedCost(tier.costEur, i.logistics ?? null);

  let markup;
  try { markup = resolveMarkup(i.markupRules, { countryId: i.countryId, boxConfigId: i.boxConfigId }); }
  catch { return UNAVAILABLE; }

  const range = sellingRange(breakdown.landedEur, markup);
  return {
    available: true,
    minEur: range.minEur,
    maxEur: range.maxEur,
    breakdown,
    markupMin: markup.markupMin,
    markupMax: markup.markupMax,
    source: 'COMPUTED',
  };
}
