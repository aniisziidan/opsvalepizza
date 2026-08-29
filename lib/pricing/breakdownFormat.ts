import type { LandedBreakdown } from './logistics';

export interface BreakdownLine { label: string; valueEur: number; }

export function detailedBreakdownLines(b: LandedBreakdown): BreakdownLine[] {
  return [
    { label: 'Product / Factory Cost', valueEur: b.productEur },
    { label: 'Freight', valueEur: b.freightEur },
    { label: 'Inland', valueEur: b.inlandEur },
    { label: 'Other', valueEur: b.otherEur },
    { label: 'Total Logistics', valueEur: b.logisticsEur },
    { label: 'Effective Landed Cost', valueEur: b.landedEur },
  ];
}

export function compactBreakdownLines(b: LandedBreakdown, countryName: string): BreakdownLine[] {
  return [
    { label: 'Factory / Product', valueEur: b.productEur },
    { label: `Logistics to ${countryName}`, valueEur: b.logisticsEur },
    { label: 'Landed Cost', valueEur: b.landedEur },
  ];
}
