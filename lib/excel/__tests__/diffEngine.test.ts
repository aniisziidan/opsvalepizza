import { describe, it, expect } from 'vitest';
import { evaluateExcelDiff, DiffDbContext } from '../diffEngine';
import { ParseResult } from '../parseWorkbook';
import { Material, PrintType, RuleScope } from '@prisma/client';

const mockContext: DiffDbContext = {
  countries: [
    { id: 'cnt-de', code: 'DE', name: 'Germany' },
    { id: 'cnt-fr', code: 'FR', name: 'France' },
  ],
  boxConfigs: [
    { id: 'box-32', sizeLabel: '32cm', material: Material.KRAFT, print: PrintType.PLAIN },
    { id: 'box-33', sizeLabel: '33cm', material: Material.WHITE, print: PrintType.PRINTED },
  ],
  activeLandedCosts: [
    {
      id: 'lc-1',
      countryId: 'cnt-de',
      boxConfigId: 'box-32',
      qtyTierMin: 10000,
      qtyTierMax: 25000,
      costEur: 0.185,
    },
  ],
  activePricingRules: [
    {
      id: 'pr-1',
      scope: RuleScope.GLOBAL,
      countryId: null,
      boxConfigId: null,
      markupMin: 0.20,
      markupMax: 0.35,
    },
  ],
  activePublicRanges: [
    {
      id: 'pbr-1',
      countryId: 'cnt-de',
      boxConfigId: 'box-32',
      minEur: 0.22,
      maxEur: 0.28,
    },
  ],
};

describe('evaluateExcelDiff', () => {
  it('correctly categorizes unchanged, update, and insert items', async () => {
    const parseResult: ParseResult = {
      landedCosts: [
        {
          rowNumber: 2,
          countryCode: 'DE',
          boxSizeLabel: '32cm',
          material: Material.KRAFT,
          print: PrintType.PLAIN,
          qtyTierMin: 10000,
          qtyTierMax: 25000,
          costEur: 0.185, // Same as active -> UNCHANGED
        },
        {
          rowNumber: 3,
          countryCode: 'DE',
          boxSizeLabel: '32cm',
          material: Material.KRAFT,
          print: PrintType.PLAIN,
          qtyTierMin: 25000,
          qtyTierMax: null,
          costEur: 0.165, // Not in active -> INSERT
        },
      ],
      pricingRules: [
        {
          rowNumber: 2,
          scope: RuleScope.GLOBAL,
          countryCode: null,
          boxSizeLabel: null,
          markupMin: 0.25, // Changed from 0.20 -> UPDATE
          markupMax: 0.40, // Changed from 0.35 -> UPDATE
        },
      ],
      publicPriceRanges: [],
      errors: [],
    };

    const diff = await evaluateExcelDiff('test_matrix.xlsx', parseResult, mockContext);

    expect(diff.fileName).toBe('test_matrix.xlsx');
    expect(diff.summary.totalRows).toBe(3);
    expect(diff.summary.unchangedCount).toBe(1);
    expect(diff.summary.insertsCount).toBe(1);
    expect(diff.summary.updatesCount).toBe(1);
    expect(diff.errors).toHaveLength(0);
    expect(diff.canCommit).toBe(true);
  });

  it('marks invalid items if country or box configuration do not exist', async () => {
    const parseResult: ParseResult = {
      landedCosts: [
        {
          rowNumber: 2,
          countryCode: 'ZZ', // Non-existent country
          boxSizeLabel: '32cm',
          material: Material.KRAFT,
          print: PrintType.PLAIN,
          qtyTierMin: 10000,
          qtyTierMax: 25000,
          costEur: 0.185,
        },
      ],
      pricingRules: [],
      publicPriceRanges: [],
      errors: [],
    };

    const diff = await evaluateExcelDiff('invalid_matrix.xlsx', parseResult, mockContext);

    expect(diff.errors.length).toBeGreaterThan(0);
    expect(diff.landedCosts[0].action).toBe('INVALID');
    expect(diff.canCommit).toBe(false);
  });
});
