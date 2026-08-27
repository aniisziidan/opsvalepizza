import { prisma } from '@/lib/db';
import {
  ExcelPreviewResult,
  ImportMode,
  LandedCostDiffItem,
  PricingRuleDiffItem,
  PublicPriceRangeDiffItem,
  RowValidationError,
} from './types';
import { ParseResult } from './parseWorkbook';

export interface DiffDbContext {
  countries: Array<{ id: string; code: string; name: string }>;
  boxConfigs: Array<{
    id: string;
    sizeLabel: string;
    material: any;
    print: any;
  }>;
  activeLandedCosts: Array<{
    id: string;
    countryId: string;
    boxConfigId: string;
    qtyTierMin: number;
    qtyTierMax: number | null;
    costEur: any;
    effectiveFrom?: Date | string;
    active?: boolean;
  }>;
  activePricingRules: Array<{
    id: string;
    scope: any;
    countryId: string | null;
    boxConfigId: string | null;
    markupMin: any;
    markupMax: any;
    effectiveFrom?: Date | string;
    active?: boolean;
  }>;
  activePublicRanges: Array<{
    id: string;
    countryId: string;
    boxConfigId: string;
    minEur: any;
    maxEur: any;
    effectiveFrom?: Date | string;
    active?: boolean;
  }>;
  allLandedCostsById?: Map<string, any>;
  allPricingRulesById?: Map<string, any>;
  allPublicRangesById?: Map<string, any>;
}

export async function evaluateExcelDiff(
  fileName: string,
  parseResult: ParseResult,
  injectedContext?: DiffDbContext,
  mode: ImportMode = 'AUTO'
): Promise<ExcelPreviewResult> {
  const errors: RowValidationError[] = [...parseResult.errors];

  // 1. Fetch DB metadata for matching
  const countries = injectedContext ? injectedContext.countries : await prisma.country.findMany();
  const countryByCode = new Map(countries.map((c) => [c.code.toUpperCase(), c]));

  const boxConfigs = injectedContext
    ? injectedContext.boxConfigs
    : await prisma.boxConfig.findMany();

  const boxConfigByKey = new Map(
    boxConfigs.map((b) => [`${b.sizeLabel.toLowerCase()}|${b.material}|${b.print}`, b])
  );
  const boxConfigBySize = new Map(
    boxConfigs.map((b) => [b.sizeLabel.toLowerCase(), b])
  );

  const activeLandedCosts = injectedContext
    ? injectedContext.activeLandedCosts
    : await prisma.landedCost.findMany({ where: { active: true } });

  const activePricingRules = injectedContext
    ? injectedContext.activePricingRules
    : await prisma.pricingRule.findMany({ where: { active: true } });

  const activePublicRanges = injectedContext
    ? injectedContext.activePublicRanges
    : await prisma.publicPriceRange.findMany({ where: { active: true } });

  // Map all historical/active records by ID for version conflict detection
  let landedCostById = injectedContext?.allLandedCostsById;
  if (!landedCostById && !injectedContext) {
    const allLanded = await prisma.landedCost.findMany();
    landedCostById = new Map(allLanded.map((l) => [l.id, l]));
  } else if (!landedCostById && injectedContext) {
    landedCostById = new Map(activeLandedCosts.map((l) => [l.id, l]));
  }

  let pricingRuleById = injectedContext?.allPricingRulesById;
  if (!pricingRuleById && !injectedContext) {
    const allRules = await prisma.pricingRule.findMany();
    pricingRuleById = new Map(allRules.map((r) => [r.id, r]));
  } else if (!pricingRuleById && injectedContext) {
    pricingRuleById = new Map(activePricingRules.map((r) => [r.id, r]));
  }

  let publicRangeById = injectedContext?.allPublicRangesById;
  if (!publicRangeById && !injectedContext) {
    const allRanges = await prisma.publicPriceRange.findMany();
    publicRangeById = new Map(allRanges.map((r) => [r.id, r]));
  } else if (!publicRangeById && injectedContext) {
    publicRangeById = new Map(activePublicRanges.map((r) => [r.id, r]));
  }

  // 2. Evaluate Landed Costs Diff
  const landedCostsDiff: LandedCostDiffItem[] = [];

  for (const row of parseResult.landedCosts) {
    const country = countryByCode.get(row.countryCode);
    if (!country) {
      errors.push({
        sheet: 'Landed Costs',
        rowNumber: row.rowNumber,
        field: 'countryCode',
        value: row.countryCode,
        message: `Country code '${row.countryCode}' does not exist in database`,
      });
      landedCostsDiff.push({
        action: 'INVALID',
        rowNumber: row.rowNumber,
        recordId: row.recordId,
        countryCode: row.countryCode,
        boxSizeLabel: row.boxSizeLabel,
        material: row.material,
        print: row.print,
        qtyTierMin: row.qtyTierMin,
        qtyTierMax: row.qtyTierMax,
        newCostEur: row.costEur,
        errors: [`Country code '${row.countryCode}' does not exist`],
      });
      continue;
    }

    const boxKey = `${row.boxSizeLabel.toLowerCase()}|${row.material}|${row.print}`;
    const boxConfig = boxConfigByKey.get(boxKey);
    if (!boxConfig) {
      errors.push({
        sheet: 'Landed Costs',
        rowNumber: row.rowNumber,
        field: 'boxSizeLabel',
        value: `${row.boxSizeLabel} (${row.material}/${row.print})`,
        message: `Box configuration '${row.boxSizeLabel}' (${row.material}/${row.print}) not found`,
      });
      landedCostsDiff.push({
        action: 'INVALID',
        rowNumber: row.rowNumber,
        recordId: row.recordId,
        countryCode: row.countryCode,
        countryName: country.name,
        boxSizeLabel: row.boxSizeLabel,
        material: row.material,
        print: row.print,
        qtyTierMin: row.qtyTierMin,
        qtyTierMax: row.qtyTierMax,
        newCostEur: row.costEur,
        errors: [`Box configuration '${row.boxSizeLabel}' not found`],
      });
      continue;
    }

    // Attempt matching: First by explicit Record ID, then by active 4-tuple
    let existingActive = activeLandedCosts.find(
      (alc) =>
        alc.countryId === country.id &&
        alc.boxConfigId === boxConfig.id &&
        alc.qtyTierMin === row.qtyTierMin &&
        (alc.qtyTierMax === row.qtyTierMax || (alc.qtyTierMax === null && row.qtyTierMax === null))
    );

    // Version conflict check if recordId was supplied in sheet
    if (row.recordId && landedCostById) {
      const referencedRecord = landedCostById.get(row.recordId);
      if (referencedRecord && referencedRecord.active === false) {
        // Record was retired/modified by another user since export
        errors.push({
          sheet: 'Landed Costs',
          rowNumber: row.rowNumber,
          field: 'recordId',
          value: row.recordId,
          message: `Stale version conflict: Record #${row.recordId} was already updated/superseded in the database. Please re-export the latest matrix.`,
          isConflict: true,
        });
        landedCostsDiff.push({
          action: 'CONFLICT',
          rowNumber: row.rowNumber,
          recordId: row.recordId,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          qtyTierMin: row.qtyTierMin,
          qtyTierMax: row.qtyTierMax,
          newCostEur: row.costEur,
          oldCostEur: Number(referencedRecord.costEur),
          existingId: row.recordId,
          versionConflict: true,
          errors: ['Stale version conflict: Record was updated in database since export.'],
        });
        continue;
      }
    }

    if (mode === 'UPDATE_EXISTING') {
      if (!existingActive) {
        errors.push({
          sheet: 'Landed Costs',
          rowNumber: row.rowNumber,
          field: 'boxSizeLabel',
          value: row.boxSizeLabel,
          message: `Record not found: New landed costs cannot be inserted in 'Update Existing' mode. Use 'Add New' mode to add new SKUs.`,
        });
        landedCostsDiff.push({
          action: 'INVALID',
          rowNumber: row.rowNumber,
          recordId: row.recordId,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          qtyTierMin: row.qtyTierMin,
          qtyTierMax: row.qtyTierMax,
          newCostEur: row.costEur,
          errors: ['Not found in update-only mode.'],
        });
      } else {
        const oldCost = Number(existingActive.costEur);
        const isDiff = Math.abs(oldCost - row.costEur) > 0.00001;
        landedCostsDiff.push({
          action: isDiff ? 'UPDATE' : 'UNCHANGED',
          rowNumber: row.rowNumber,
          recordId: row.recordId || existingActive.id,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          qtyTierMin: row.qtyTierMin,
          qtyTierMax: row.qtyTierMax,
          newCostEur: row.costEur,
          oldCostEur: oldCost,
          existingId: existingActive.id,
        });
      }
    } else if (mode === 'ADD_NEW') {
      if (existingActive) {
        errors.push({
          sheet: 'Landed Costs',
          rowNumber: row.rowNumber,
          field: 'boxSizeLabel',
          value: row.boxSizeLabel,
          message: `Duplicate active configuration: Landed cost already exists for ${country.code} - ${boxConfig.sizeLabel} (€${Number(existingActive.costEur)}). Use 'Update Existing' mode to edit.`,
          isConflict: true,
        });
        landedCostsDiff.push({
          action: 'CONFLICT',
          rowNumber: row.rowNumber,
          recordId: row.recordId,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          qtyTierMin: row.qtyTierMin,
          qtyTierMax: row.qtyTierMax,
          newCostEur: row.costEur,
          oldCostEur: Number(existingActive.costEur),
          existingId: existingActive.id,
          versionConflict: true,
          errors: ['Configuration already exists in database.'],
        });
      } else {
        landedCostsDiff.push({
          action: 'INSERT',
          rowNumber: row.rowNumber,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          qtyTierMin: row.qtyTierMin,
          qtyTierMax: row.qtyTierMax,
          newCostEur: row.costEur,
        });
      }
    } else {
      // AUTO mode
      if (existingActive) {
        const oldCost = Number(existingActive.costEur);
        const isDiff = Math.abs(oldCost - row.costEur) > 0.00001;
        landedCostsDiff.push({
          action: isDiff ? 'UPDATE' : 'UNCHANGED',
          rowNumber: row.rowNumber,
          recordId: row.recordId || existingActive.id,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          qtyTierMin: row.qtyTierMin,
          qtyTierMax: row.qtyTierMax,
          newCostEur: row.costEur,
          oldCostEur: oldCost,
          existingId: existingActive.id,
        });
      } else {
        landedCostsDiff.push({
          action: 'INSERT',
          rowNumber: row.rowNumber,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          qtyTierMin: row.qtyTierMin,
          qtyTierMax: row.qtyTierMax,
          newCostEur: row.costEur,
        });
      }
    }
  }

  // 3. Evaluate Pricing Rules Diff
  const pricingRulesDiff: PricingRuleDiffItem[] = [];

  for (const row of parseResult.pricingRules) {
    let countryId: string | null = null;
    let countryName: string | null = null;

    if (row.countryCode) {
      const country = countryByCode.get(row.countryCode);
      if (!country) {
        errors.push({
          sheet: 'Pricing Rules',
          rowNumber: row.rowNumber,
          field: 'countryCode',
          value: row.countryCode,
          message: `Country code '${row.countryCode}' does not exist`,
        });
        pricingRulesDiff.push({
          action: 'INVALID',
          rowNumber: row.rowNumber,
          scope: row.scope,
          countryCode: row.countryCode,
          newMarkupMin: row.markupMin,
          newMarkupMax: row.markupMax,
          errors: [`Country code '${row.countryCode}' does not exist`],
        });
        continue;
      }
      countryId = country.id;
      countryName = country.name;
    }

    let boxConfigId: string | null = null;
    let boxSizeLabel: string | null = null;

    if (row.boxSizeLabel) {
      const box = boxConfigBySize.get(row.boxSizeLabel.toLowerCase());
      if (!box) {
        errors.push({
          sheet: 'Pricing Rules',
          rowNumber: row.rowNumber,
          field: 'boxSizeLabel',
          value: row.boxSizeLabel,
          message: `Box size '${row.boxSizeLabel}' not found`,
        });
        pricingRulesDiff.push({
          action: 'INVALID',
          rowNumber: row.rowNumber,
          scope: row.scope,
          countryCode: row.countryCode,
          countryName: countryName || undefined,
          boxSizeLabel: row.boxSizeLabel,
          newMarkupMin: row.markupMin,
          newMarkupMax: row.markupMax,
          errors: [`Box size '${row.boxSizeLabel}' not found`],
        });
        continue;
      }
      boxConfigId = box.id;
      boxSizeLabel = box.sizeLabel;
    }

    const existingActive = activePricingRules.find(
      (apr) =>
        apr.scope === row.scope &&
        (apr.countryId === countryId || (!apr.countryId && !countryId)) &&
        (apr.boxConfigId === boxConfigId || (!apr.boxConfigId && !boxConfigId))
    );

    // Stale version check
    if (row.recordId && pricingRuleById) {
      const referenced = pricingRuleById.get(row.recordId);
      if (referenced && referenced.active === false) {
        errors.push({
          sheet: 'Pricing Rules',
          rowNumber: row.rowNumber,
          field: 'recordId',
          value: row.recordId,
          message: `Stale version conflict: Pricing rule #${row.recordId} was already modified in database. Please re-export.`,
          isConflict: true,
        });
        pricingRulesDiff.push({
          action: 'CONFLICT',
          rowNumber: row.rowNumber,
          recordId: row.recordId,
          scope: row.scope,
          countryCode: row.countryCode,
          countryName: countryName || undefined,
          boxSizeLabel: boxSizeLabel || undefined,
          newMarkupMin: row.markupMin,
          newMarkupMax: row.markupMax,
          oldMarkupMin: Number(referenced.markupMin),
          oldMarkupMax: Number(referenced.markupMax),
          existingId: row.recordId,
          versionConflict: true,
          errors: ['Stale version conflict on rule.'],
        });
        continue;
      }
    }

    if (mode === 'UPDATE_EXISTING') {
      if (!existingActive) {
        errors.push({
          sheet: 'Pricing Rules',
          rowNumber: row.rowNumber,
          field: 'scope',
          value: row.scope,
          message: `Rule not found in 'Update Existing' mode. Use 'Add New' mode to define new rules.`,
        });
        pricingRulesDiff.push({
          action: 'INVALID',
          rowNumber: row.rowNumber,
          recordId: row.recordId,
          scope: row.scope,
          countryCode: row.countryCode,
          newMarkupMin: row.markupMin,
          newMarkupMax: row.markupMax,
          errors: ['Not found in update-only mode.'],
        });
      } else {
        const oldMin = Number(existingActive.markupMin);
        const oldMax = Number(existingActive.markupMax);
        const isDiff =
          Math.abs(oldMin - row.markupMin) > 0.0001 || Math.abs(oldMax - row.markupMax) > 0.0001;

        pricingRulesDiff.push({
          action: isDiff ? 'UPDATE' : 'UNCHANGED',
          rowNumber: row.rowNumber,
          recordId: row.recordId || existingActive.id,
          scope: row.scope,
          countryCode: row.countryCode,
          countryName: countryName || undefined,
          boxSizeLabel: boxSizeLabel || undefined,
          newMarkupMin: row.markupMin,
          newMarkupMax: row.markupMax,
          oldMarkupMin: oldMin,
          oldMarkupMax: oldMax,
          existingId: existingActive.id,
        });
      }
    } else if (mode === 'ADD_NEW') {
      if (existingActive) {
        errors.push({
          sheet: 'Pricing Rules',
          rowNumber: row.rowNumber,
          field: 'scope',
          value: row.scope,
          message: `Duplicate active rule: Pricing rule already exists for scope ${row.scope}. Use 'Update Existing' mode to edit.`,
          isConflict: true,
        });
        pricingRulesDiff.push({
          action: 'CONFLICT',
          rowNumber: row.rowNumber,
          recordId: row.recordId,
          scope: row.scope,
          countryCode: row.countryCode,
          newMarkupMin: row.markupMin,
          newMarkupMax: row.markupMax,
          oldMarkupMin: Number(existingActive.markupMin),
          oldMarkupMax: Number(existingActive.markupMax),
          existingId: existingActive.id,
          versionConflict: true,
          errors: ['Rule already exists in database.'],
        });
      } else {
        pricingRulesDiff.push({
          action: 'INSERT',
          rowNumber: row.rowNumber,
          scope: row.scope,
          countryCode: row.countryCode,
          countryName: countryName || undefined,
          boxSizeLabel: boxSizeLabel || undefined,
          newMarkupMin: row.markupMin,
          newMarkupMax: row.markupMax,
        });
      }
    } else {
      if (existingActive) {
        const oldMin = Number(existingActive.markupMin);
        const oldMax = Number(existingActive.markupMax);
        const isDiff =
          Math.abs(oldMin - row.markupMin) > 0.0001 || Math.abs(oldMax - row.markupMax) > 0.0001;

        pricingRulesDiff.push({
          action: isDiff ? 'UPDATE' : 'UNCHANGED',
          rowNumber: row.rowNumber,
          recordId: row.recordId || existingActive.id,
          scope: row.scope,
          countryCode: row.countryCode,
          countryName: countryName || undefined,
          boxSizeLabel: boxSizeLabel || undefined,
          newMarkupMin: row.markupMin,
          newMarkupMax: row.markupMax,
          oldMarkupMin: oldMin,
          oldMarkupMax: oldMax,
          existingId: existingActive.id,
        });
      } else {
        pricingRulesDiff.push({
          action: 'INSERT',
          rowNumber: row.rowNumber,
          scope: row.scope,
          countryCode: row.countryCode,
          countryName: countryName || undefined,
          boxSizeLabel: boxSizeLabel || undefined,
          newMarkupMin: row.markupMin,
          newMarkupMax: row.markupMax,
        });
      }
    }
  }

  // 4. Evaluate Public Price Ranges Diff
  const publicRangesDiff: PublicPriceRangeDiffItem[] = [];

  for (const row of parseResult.publicPriceRanges) {
    const country = countryByCode.get(row.countryCode);
    if (!country) {
      errors.push({
        sheet: 'Public Price Overrides',
        rowNumber: row.rowNumber,
        field: 'countryCode',
        value: row.countryCode,
        message: `Country code '${row.countryCode}' does not exist`,
      });
      publicRangesDiff.push({
        action: 'INVALID',
        rowNumber: row.rowNumber,
        recordId: row.recordId,
        countryCode: row.countryCode,
        boxSizeLabel: row.boxSizeLabel,
        material: row.material,
        print: row.print,
        newMinEur: row.minEur,
        newMaxEur: row.maxEur,
        errors: [`Country '${row.countryCode}' not found`],
      });
      continue;
    }

    const boxKey = `${row.boxSizeLabel.toLowerCase()}|${row.material}|${row.print}`;
    const boxConfig = boxConfigByKey.get(boxKey);
    if (!boxConfig) {
      errors.push({
        sheet: 'Public Price Overrides',
        rowNumber: row.rowNumber,
        field: 'boxSizeLabel',
        value: `${row.boxSizeLabel} (${row.material}/${row.print})`,
        message: `Box config '${row.boxSizeLabel}' not found`,
      });
      publicRangesDiff.push({
        action: 'INVALID',
        rowNumber: row.rowNumber,
        recordId: row.recordId,
        countryCode: row.countryCode,
        countryName: country.name,
        boxSizeLabel: row.boxSizeLabel,
        material: row.material,
        print: row.print,
        newMinEur: row.minEur,
        newMaxEur: row.maxEur,
        errors: [`Box '${row.boxSizeLabel}' not found`],
      });
      continue;
    }

    const existingActive = activePublicRanges.find(
      (apr) => apr.countryId === country.id && apr.boxConfigId === boxConfig.id
    );

    // Stale check
    if (row.recordId && publicRangeById) {
      const referenced = publicRangeById.get(row.recordId);
      if (referenced && referenced.active === false) {
        errors.push({
          sheet: 'Public Price Overrides',
          rowNumber: row.rowNumber,
          field: 'recordId',
          value: row.recordId,
          message: `Stale version conflict: Public price range #${row.recordId} was already modified in database. Please re-export.`,
          isConflict: true,
        });
        publicRangesDiff.push({
          action: 'CONFLICT',
          rowNumber: row.rowNumber,
          recordId: row.recordId,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          newMinEur: row.minEur,
          newMaxEur: row.maxEur,
          oldMinEur: Number(referenced.minEur),
          oldMaxEur: Number(referenced.maxEur),
          existingId: row.recordId,
          versionConflict: true,
          errors: ['Stale version conflict on public range.'],
        });
        continue;
      }
    }

    if (mode === 'UPDATE_EXISTING') {
      if (!existingActive) {
        errors.push({
          sheet: 'Public Price Overrides',
          rowNumber: row.rowNumber,
          field: 'boxSizeLabel',
          value: row.boxSizeLabel,
          message: `Public range not found in 'Update Existing' mode. Use 'Add New' mode to define new public overrides.`,
        });
        publicRangesDiff.push({
          action: 'INVALID',
          rowNumber: row.rowNumber,
          recordId: row.recordId,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          newMinEur: row.minEur,
          newMaxEur: row.maxEur,
          errors: ['Not found in update-only mode.'],
        });
      } else {
        const oldMin = Number(existingActive.minEur);
        const oldMax = Number(existingActive.maxEur);
        const isDiff =
          Math.abs(oldMin - row.minEur) > 0.0001 || Math.abs(oldMax - row.maxEur) > 0.0001;

        publicRangesDiff.push({
          action: isDiff ? 'UPDATE' : 'UNCHANGED',
          rowNumber: row.rowNumber,
          recordId: row.recordId || existingActive.id,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          newMinEur: row.minEur,
          newMaxEur: row.maxEur,
          oldMinEur: oldMin,
          oldMaxEur: oldMax,
          existingId: existingActive.id,
        });
      }
    } else if (mode === 'ADD_NEW') {
      if (existingActive) {
        errors.push({
          sheet: 'Public Price Overrides',
          rowNumber: row.rowNumber,
          field: 'boxSizeLabel',
          value: row.boxSizeLabel,
          message: `Duplicate public override: Range already exists for ${country.code} - ${boxConfig.sizeLabel}. Use 'Update Existing' mode to edit.`,
          isConflict: true,
        });
        publicRangesDiff.push({
          action: 'CONFLICT',
          rowNumber: row.rowNumber,
          recordId: row.recordId,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          newMinEur: row.minEur,
          newMaxEur: row.maxEur,
          oldMinEur: Number(existingActive.minEur),
          oldMaxEur: Number(existingActive.maxEur),
          existingId: existingActive.id,
          versionConflict: true,
          errors: ['Override already exists in database.'],
        });
      } else {
        publicRangesDiff.push({
          action: 'INSERT',
          rowNumber: row.rowNumber,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          newMinEur: row.minEur,
          newMaxEur: row.maxEur,
        });
      }
    } else {
      if (existingActive) {
        const oldMin = Number(existingActive.minEur);
        const oldMax = Number(existingActive.maxEur);
        const isDiff =
          Math.abs(oldMin - row.minEur) > 0.0001 || Math.abs(oldMax - row.maxEur) > 0.0001;

        publicRangesDiff.push({
          action: isDiff ? 'UPDATE' : 'UNCHANGED',
          rowNumber: row.rowNumber,
          recordId: row.recordId || existingActive.id,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          newMinEur: row.minEur,
          newMaxEur: row.maxEur,
          oldMinEur: oldMin,
          oldMaxEur: oldMax,
          existingId: existingActive.id,
        });
      } else {
        publicRangesDiff.push({
          action: 'INSERT',
          rowNumber: row.rowNumber,
          countryCode: country.code,
          countryName: country.name,
          boxSizeLabel: boxConfig.sizeLabel,
          material: boxConfig.material,
          print: boxConfig.print,
          newMinEur: row.minEur,
          newMaxEur: row.maxEur,
        });
      }
    }
  }

  // 5. Calculate summary metrics
  const allItems = [...landedCostsDiff, ...pricingRulesDiff, ...publicRangesDiff];
  const insertsCount = allItems.filter((i) => i.action === 'INSERT').length;
  const updatesCount = allItems.filter((i) => i.action === 'UPDATE').length;
  const unchangedCount = allItems.filter((i) => i.action === 'UNCHANGED').length;
  const conflictsCount = allItems.filter((i) => i.action === 'CONFLICT').length;
  const errorsCount = errors.length;

  return {
    fileName,
    importMode: mode,
    summary: {
      totalRows: allItems.length,
      insertsCount,
      updatesCount,
      unchangedCount,
      conflictsCount,
      errorsCount,
    },
    landedCosts: landedCostsDiff,
    pricingRules: pricingRulesDiff,
    publicPriceRanges: publicRangesDiff,
    errors,
    canCommit: errorsCount === 0 && conflictsCount === 0 && (insertsCount > 0 || updatesCount > 0),
  };
}
