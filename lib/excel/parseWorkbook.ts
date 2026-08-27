import * as XLSX from 'xlsx';
import { Material, PrintType, RuleScope } from '@prisma/client';
import {
  excelLandedCostRowSchema,
  excelPricingRuleRowSchema,
  excelPublicPriceRangeRowSchema,
  normalizeNumber,
  normalizeEnum,
} from './validation';
import {
  ParsedLandedCostRow,
  ParsedPricingRuleRow,
  ParsedPublicPriceRangeRow,
  RowValidationError,
} from './types';

export interface ParseResult {
  landedCosts: ParsedLandedCostRow[];
  pricingRules: ParsedPricingRuleRow[];
  publicPriceRanges: ParsedPublicPriceRangeRow[];
  errors: RowValidationError[];
}

function normalizeHeaderKey(header: string): string {
  const clean = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (clean.includes('recordid') || clean === 'id') return 'recordId';
  if (clean.includes('timestamp') || clean.includes('version')) return 'versionTimestamp';
  if (clean.includes('country')) return 'countryCode';
  if (clean.includes('size') || clean.includes('box')) return 'boxSizeLabel';
  if (clean.includes('material')) return 'material';
  if (clean.includes('print')) return 'print';
  if (clean.includes('tiermin') || clean.includes('qtymin') || (clean.includes('min') && clean.includes('tier'))) return 'qtyTierMin';
  if (clean.includes('tiermax') || clean.includes('qtymax') || (clean.includes('max') && clean.includes('tier'))) return 'qtyTierMax';
  if (clean.includes('landed') || clean.includes('cost')) return 'costEur';
  if (clean.includes('scope')) return 'scope';
  if (clean.includes('minmarkup') || (clean.includes('markup') && clean.includes('min'))) return 'markupMin';
  if (clean.includes('maxmarkup') || (clean.includes('markup') && clean.includes('max'))) return 'markupMax';
  if (clean.includes('minprice') || (clean.includes('price') && clean.includes('min'))) return 'minEur';
  if (clean.includes('maxprice') || (clean.includes('price') && clean.includes('max'))) return 'maxEur';
  return clean;
}

function findSheet(wb: XLSX.WorkBook, searchTerms: string[]): XLSX.WorkSheet | null {
  for (const name of wb.SheetNames) {
    const lower = name.toLowerCase();
    if (searchTerms.some((term) => lower.includes(term))) {
      return wb.Sheets[name];
    }
  }
  return null;
}

export function parsePricingWorkbook(buffer: Buffer): ParseResult {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const errors: RowValidationError[] = [];
  const landedCosts: ParsedLandedCostRow[] = [];
  const pricingRules: ParsedPricingRuleRow[] = [];
  const publicPriceRanges: ParsedPublicPriceRangeRow[] = [];

  // 1. Parse Landed Costs Sheet
  const landedSheet = findSheet(wb, ['landed', 'cost']);
  if (landedSheet) {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(landedSheet, { raw: false, defval: '' });
    rawRows.forEach((rawRow, idx) => {
      const rowNumber = idx + 2; // header is row 1
      const normalized: Record<string, any> = {};
      for (const [key, val] of Object.entries(rawRow)) {
        normalized[normalizeHeaderKey(key)] = val;
      }

      // Check if completely blank row
      if (!normalized.countryCode && !normalized.boxSizeLabel && !normalized.costEur && !normalized.recordId) return;

      const recordId = normalized.recordId ? String(normalized.recordId).trim() : null;
      const versionTimestamp = normalized.versionTimestamp ? String(normalized.versionTimestamp).trim() : null;

      const material = normalizeEnum<Material>(normalized.material, ['KRAFT', 'WHITE']);
      const print = normalizeEnum<PrintType>(normalized.print, ['PLAIN', 'PRINTED']);
      const qtyTierMin = normalizeNumber(normalized.qtyTierMin) ?? 0;
      const qtyTierMax = normalizeNumber(normalized.qtyTierMax);
      const costEur = normalizeNumber(normalized.costEur);

      const candidate = {
        rowNumber,
        recordId,
        versionTimestamp,
        countryCode: String(normalized.countryCode || '').trim().toUpperCase(),
        boxSizeLabel: String(normalized.boxSizeLabel || '').trim(),
        material: material as Material,
        print: print as PrintType,
        qtyTierMin,
        qtyTierMax: qtyTierMax ? Math.round(qtyTierMax) : null,
        costEur: costEur ?? 0,
      };

      const result = excelLandedCostRowSchema.safeParse(candidate);
      if (result.success) {
        landedCosts.push({
          ...result.data,
          recordId,
          versionTimestamp,
        } as ParsedLandedCostRow);
      } else {
        result.error.issues.forEach((issue) => {
          errors.push({
            sheet: 'Landed Costs',
            rowNumber,
            field: issue.path.join('.') || 'row',
            value: (candidate as any)[issue.path[0]] ?? '',
            message: issue.message,
          });
        });
      }
    });
  }

  // 2. Parse Pricing Rules Sheet
  const rulesSheet = findSheet(wb, ['rule', 'pricing rule', 'markup']);
  if (rulesSheet) {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(rulesSheet, { raw: false, defval: '' });
    rawRows.forEach((rawRow, idx) => {
      const rowNumber = idx + 2;
      const normalized: Record<string, any> = {};
      for (const [key, val] of Object.entries(rawRow)) {
        normalized[normalizeHeaderKey(key)] = val;
      }

      if (!normalized.scope && !normalized.markupMin && !normalized.markupMax && !normalized.recordId) return;

      const recordId = normalized.recordId ? String(normalized.recordId).trim() : null;
      const versionTimestamp = normalized.versionTimestamp ? String(normalized.versionTimestamp).trim() : null;

      const scope = normalizeEnum<RuleScope>(normalized.scope, ['GLOBAL', 'COUNTRY', 'PRODUCT']) ?? ('GLOBAL' as RuleScope);
      const markupMin = normalizeNumber(normalized.markupMin);
      const markupMax = normalizeNumber(normalized.markupMax);

      const candidate = {
        rowNumber,
        recordId,
        versionTimestamp,
        scope,
        countryCode: normalized.countryCode ? String(normalized.countryCode).trim().toUpperCase() : null,
        boxSizeLabel: normalized.boxSizeLabel ? String(normalized.boxSizeLabel).trim() : null,
        markupMin: markupMin ?? 0,
        markupMax: markupMax ?? 0,
      };

      const result = excelPricingRuleRowSchema.safeParse(candidate);
      if (result.success) {
        pricingRules.push({
          ...result.data,
          recordId,
          versionTimestamp,
        } as ParsedPricingRuleRow);
      } else {
        result.error.issues.forEach((issue) => {
          errors.push({
            sheet: 'Pricing Rules',
            rowNumber,
            field: issue.path.join('.') || 'row',
            value: (candidate as any)[issue.path[0]] ?? '',
            message: issue.message,
          });
        });
      }
    });
  }

  // 3. Parse Public Price Overrides Sheet
  const publicSheet = findSheet(wb, ['public', 'override', 'range']);
  if (publicSheet) {
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(publicSheet, { raw: false, defval: '' });
    rawRows.forEach((rawRow, idx) => {
      const rowNumber = idx + 2;
      const normalized: Record<string, any> = {};
      for (const [key, val] of Object.entries(rawRow)) {
        normalized[normalizeHeaderKey(key)] = val;
      }

      if (!normalized.countryCode && !normalized.boxSizeLabel && !normalized.minEur && !normalized.maxEur && !normalized.recordId) return;

      const recordId = normalized.recordId ? String(normalized.recordId).trim() : null;
      const versionTimestamp = normalized.versionTimestamp ? String(normalized.versionTimestamp).trim() : null;

      const material = normalizeEnum<Material>(normalized.material, ['KRAFT', 'WHITE']);
      const print = normalizeEnum<PrintType>(normalized.print, ['PLAIN', 'PRINTED']);
      const minEur = normalizeNumber(normalized.minEur);
      const maxEur = normalizeNumber(normalized.maxEur);

      const candidate = {
        rowNumber,
        recordId,
        versionTimestamp,
        countryCode: String(normalized.countryCode || '').trim().toUpperCase(),
        boxSizeLabel: String(normalized.boxSizeLabel || '').trim(),
        material: material as Material,
        print: print as PrintType,
        minEur: minEur ?? 0,
        maxEur: maxEur ?? 0,
      };

      const result = excelPublicPriceRangeRowSchema.safeParse(candidate);
      if (result.success) {
        publicPriceRanges.push({
          ...result.data,
          recordId,
          versionTimestamp,
        } as ParsedPublicPriceRangeRow);
      } else {
        result.error.issues.forEach((issue) => {
          errors.push({
            sheet: 'Public Price Overrides',
            rowNumber,
            field: issue.path.join('.') || 'row',
            value: (candidate as any)[issue.path[0]] ?? '',
            message: issue.message,
          });
        });
      }
    });
  }

  return {
    landedCosts,
    pricingRules,
    publicPriceRanges,
    errors,
  };
}
