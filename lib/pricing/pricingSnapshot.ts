import type { LandedBreakdown } from './logistics';

export interface CalculatorPricingFields {
  productCostEur: number;
  logisticsCostId: string | null;
  logisticsCorridorName: string | null;
  freightEur: number;
  inlandEur: number;
  otherEur: number;
  logisticsTotalEur: number;
  effectiveLandedEur: number;
}

/** Scalar snapshot of the breakdown for the CalculatorSnapshot row. */
export function calculatorPricingFields(b: LandedBreakdown): CalculatorPricingFields {
  return {
    productCostEur: b.productEur,
    logisticsCostId: b.corridorId,
    logisticsCorridorName: b.corridorName,
    freightEur: b.freightEur,
    inlandEur: b.inlandEur,
    otherEur: b.otherEur,
    logisticsTotalEur: b.logisticsEur,
    effectiveLandedEur: b.landedEur,
  };
}

export interface QuotePricingSnapshot {
  productCostEur: number;
  corridorId: string | null;
  corridorName: string | null;
  freightEur: number;
  inlandEur: number;
  otherEur: number;
  logisticsTotalEur: number;
  effectiveLandedEur: number;
  markupMinPct: number;
  markupMaxPct: number;
  suggestedMinEur: number;
  suggestedMaxEur: number;
  noLogisticsConfigured: boolean;
  capturedAt: string;
}

export function buildQuotePricingSnapshot(input: {
  breakdown: LandedBreakdown;
  markupMin: number;
  markupMax: number;
  suggestedMinEur: number;
  suggestedMaxEur: number;
  capturedAt: string;
}): QuotePricingSnapshot {
  const b = input.breakdown;
  return {
    productCostEur: b.productEur,
    corridorId: b.corridorId,
    corridorName: b.corridorName,
    freightEur: b.freightEur,
    inlandEur: b.inlandEur,
    otherEur: b.otherEur,
    logisticsTotalEur: b.logisticsEur,
    effectiveLandedEur: b.landedEur,
    markupMinPct: Math.round(input.markupMin * 1000) / 10,
    markupMaxPct: Math.round(input.markupMax * 1000) / 10,
    suggestedMinEur: input.suggestedMinEur,
    suggestedMaxEur: input.suggestedMaxEur,
    noLogisticsConfigured: b.noLogisticsConfigured,
    capturedAt: input.capturedAt,
  };
}
