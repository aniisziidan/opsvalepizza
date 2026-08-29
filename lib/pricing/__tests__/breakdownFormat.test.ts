import { describe, it, expect } from 'vitest';
import { effectiveLandedCost, type Corridor } from '../logistics';
import { detailedBreakdownLines, compactBreakdownLines } from '../breakdownFormat';

const corridor: Corridor = { id: 'c-it', name: 'Genoa', freightEur: 0.04, inlandEur: 0.02, otherEur: 0.01 };

describe('detailedBreakdownLines', () => {
  it('lists product, each logistics component, total logistics, and landed', () => {
    const lines = detailedBreakdownLines(effectiveLandedCost(0.18, corridor));
    expect(lines.map((l) => l.label)).toEqual([
      'Product / Factory Cost', 'Freight', 'Inland', 'Other', 'Total Logistics', 'Effective Landed Cost',
    ]);
    expect(lines[5].valueEur).toBeCloseTo(0.25, 4);
  });
});

describe('compactBreakdownLines', () => {
  it('shows factory, logistics-to-country, and landed', () => {
    const lines = compactBreakdownLines(effectiveLandedCost(0.18, corridor), 'Italy');
    expect(lines.map((l) => l.label)).toEqual([
      'Factory / Product', 'Logistics to Italy', 'Landed Cost',
    ]);
    expect(lines[1].valueEur).toBeCloseTo(0.07, 4);
  });
});
