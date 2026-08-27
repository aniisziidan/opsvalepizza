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
    { id: 'box-33', sizeLabel: '33cm (13-inch)', material: Material.WHITE, print: PrintType.PRINTED },
  ],
  activeLandedCosts: [
    {
      id: 'lc-active-1',
      countryId: 'cnt-de',
      boxConfigId: 'box-32',
      qtyTierMin: 10000,
      qtyTierMax: 25000,
      costEur: 0.185,
      active: true,
    },
  ],
  activePricingRules: [
    {
      id: 'pr-active-1',
      scope: RuleScope.GLOBAL,
      countryId: null,
      boxConfigId: null,
      markupMin: 0.20,
      markupMax: 0.35,
      active: true,
    },
  ],
  activePublicRanges: [],
  allLandedCostsById: new Map([
    [
      'lc-active-1',
      {
        id: 'lc-active-1',
        countryId: 'cnt-de',
        boxConfigId: 'box-32',
        costEur: 0.185,
        active: true,
      },
    ],
    [
      'lc-retired-stale',
      {
        id: 'lc-retired-stale',
        countryId: 'cnt-de',
        boxConfigId: 'box-32',
        costEur: 0.175,
        active: false, // Superseded by another session
      },
    ],
  ]),
};

describe('Import Modes & Version Conflict Protections', () => {
  describe('UPDATE_EXISTING Mode', () => {
    it('successfully processes valid updates for existing records', async () => {
      const parseResult: ParseResult = {
        landedCosts: [
          {
            rowNumber: 2,
            recordId: 'lc-active-1',
            countryCode: 'DE',
            boxSizeLabel: '32cm',
            material: Material.KRAFT,
            print: PrintType.PLAIN,
            qtyTierMin: 10000,
            qtyTierMax: 25000,
            costEur: 0.195, // Modified cost
          },
        ],
        pricingRules: [],
        publicPriceRanges: [],
        errors: [],
      };

      const diff = await evaluateExcelDiff('update_matrix.xlsx', parseResult, mockContext, 'UPDATE_EXISTING');

      expect(diff.importMode).toBe('UPDATE_EXISTING');
      expect(diff.summary.updatesCount).toBe(1);
      expect(diff.summary.conflictsCount).toBe(0);
      expect(diff.landedCosts[0].action).toBe('UPDATE');
      expect(diff.landedCosts[0].oldCostEur).toBe(0.185);
      expect(diff.landedCosts[0].newCostEur).toBe(0.195);
      expect(diff.canCommit).toBe(true);
    });

    it('flags CONFLICT and blocks commit when recordId has been retired/superseded concurrently', async () => {
      const parseResult: ParseResult = {
        landedCosts: [
          {
            rowNumber: 2,
            recordId: 'lc-retired-stale', // Outdated version from old export
            countryCode: 'DE',
            boxSizeLabel: '32cm',
            material: Material.KRAFT,
            print: PrintType.PLAIN,
            qtyTierMin: 10000,
            qtyTierMax: 25000,
            costEur: 0.195,
          },
        ],
        pricingRules: [],
        publicPriceRanges: [],
        errors: [],
      };

      const diff = await evaluateExcelDiff('stale_export.xlsx', parseResult, mockContext, 'UPDATE_EXISTING');

      expect(diff.summary.conflictsCount).toBe(1);
      expect(diff.landedCosts[0].action).toBe('CONFLICT');
      expect(diff.landedCosts[0].versionConflict).toBe(true);
      expect(diff.canCommit).toBe(false);
      expect(diff.errors[0].message).toContain('Stale version conflict');
    });

    it('rejects adding new unmapped SKUs when in UPDATE_EXISTING mode', async () => {
      const parseResult: ParseResult = {
        landedCosts: [
          {
            rowNumber: 2,
            countryCode: 'FR',
            boxSizeLabel: '33cm (13-inch)',
            material: Material.WHITE,
            print: PrintType.PRINTED,
            qtyTierMin: 5000,
            qtyTierMax: 10000,
            costEur: 0.22,
          },
        ],
        pricingRules: [],
        publicPriceRanges: [],
        errors: [],
      };

      const diff = await evaluateExcelDiff('new_rows_in_update.xlsx', parseResult, mockContext, 'UPDATE_EXISTING');

      expect(diff.landedCosts[0].action).toBe('INVALID');
      expect(diff.canCommit).toBe(false);
      expect(diff.errors[0].message).toContain("cannot be inserted in 'Update Existing' mode");
    });
  });

  describe('ADD_NEW Mode', () => {
    it('successfully processes new configurations', async () => {
      const parseResult: ParseResult = {
        landedCosts: [
          {
            rowNumber: 2,
            countryCode: 'FR',
            boxSizeLabel: '33cm (13-inch)',
            material: Material.WHITE,
            print: PrintType.PRINTED,
            qtyTierMin: 5000,
            qtyTierMax: 10000,
            costEur: 0.22,
          },
        ],
        pricingRules: [],
        publicPriceRanges: [],
        errors: [],
      };

      const diff = await evaluateExcelDiff('add_new.xlsx', parseResult, mockContext, 'ADD_NEW');

      expect(diff.importMode).toBe('ADD_NEW');
      expect(diff.summary.insertsCount).toBe(1);
      expect(diff.summary.conflictsCount).toBe(0);
      expect(diff.landedCosts[0].action).toBe('INSERT');
      expect(diff.canCommit).toBe(true);
    });

    it('flags CONFLICT when attempting to insert an SKU/tier that already actively exists', async () => {
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
            costEur: 0.20,
          },
        ],
        pricingRules: [],
        publicPriceRanges: [],
        errors: [],
      };

      const diff = await evaluateExcelDiff('duplicate_in_add.xlsx', parseResult, mockContext, 'ADD_NEW');

      expect(diff.summary.conflictsCount).toBe(1);
      expect(diff.landedCosts[0].action).toBe('CONFLICT');
      expect(diff.canCommit).toBe(false);
      expect(diff.errors[0].message).toContain('Duplicate active configuration');
    });
  });
});
