import { describe, it, expect } from 'vitest';
import { generatePricingWorkbook } from '../generateWorkbook';
import { parsePricingWorkbook } from '../parseWorkbook';
import { evaluateExcelDiff, DiffDbContext } from '../diffEngine';
import { Material, PrintType, RuleScope } from '@prisma/client';

const mockContext: DiffDbContext = {
  countries: [
    { id: 'cnt-de', code: 'DE', name: 'Germany' },
    { id: 'cnt-fr', code: 'FR', name: 'France' },
    { id: 'cnt-it', code: 'IT', name: 'Italy' },
  ],
  boxConfigs: [
    { id: 'box-32', sizeLabel: '32cm', material: Material.KRAFT, print: PrintType.PLAIN },
    { id: 'box-33', sizeLabel: '33cm (13-inch)', material: Material.WHITE, print: PrintType.PRINTED },
    { id: 'box-28', sizeLabel: '28cm (10-inch)', material: Material.KRAFT, print: PrintType.PLAIN },
  ],
  activeLandedCosts: [],
  activePricingRules: [
    {
      id: 'pr-global',
      scope: RuleScope.GLOBAL,
      countryId: null,
      boxConfigId: null,
      markupMin: 0.20,
      markupMax: 0.35,
    },
  ],
  activePublicRanges: [],
};

describe('Excel Bulk Pricing Engine Integration', () => {
  it('performs full roundtrip: export blank template -> parse -> evaluate diff', async () => {
    // 1. Generate blank template
    const templateBuffer = await generatePricingWorkbook({ type: 'blank' });
    expect(templateBuffer).toBeInstanceOf(Buffer);

    // 2. Parse workbook
    const parseResult = parsePricingWorkbook(templateBuffer);
    expect(parseResult.errors).toHaveLength(0);
    expect(parseResult.landedCosts.length).toBeGreaterThan(0);
    expect(parseResult.pricingRules.length).toBeGreaterThan(0);
    expect(parseResult.publicPriceRanges.length).toBeGreaterThan(0);

    // 3. Evaluate diff
    const previewResult = await evaluateExcelDiff('template.xlsx', parseResult, mockContext);
    expect(previewResult.fileName).toBe('template.xlsx');
    expect(previewResult.summary.totalRows).toBeGreaterThan(0);
    expect(previewResult.summary.errorsCount).toBe(0);
    expect(previewResult.canCommit).toBe(true);

    // Verify all parsed landed costs are classified
    expect(previewResult.landedCosts.length).toBe(parseResult.landedCosts.length);
    for (const lc of previewResult.landedCosts) {
      expect(['INSERT', 'UPDATE', 'UNCHANGED']).toContain(lc.action);
    }
  });
});
