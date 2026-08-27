import { z } from 'zod';
import { Material, PrintType, RuleScope } from '@prisma/client';

const MIN_MARKUP = 0.15;
const MAX_MARKUP = 0.45;

/**
 * Normalizes numeric inputs from Excel which might be strings with currency signs or percentages.
 */
export function normalizeNumber(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[€$£,\s]/g, '').trim();
    if (cleaned.endsWith('%')) {
      const num = parseFloat(cleaned.slice(0, -1));
      return isNaN(num) ? null : num / 100;
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Normalizes string enum inputs to uppercase trimmed.
 */
export function normalizeEnum<T extends string>(val: any, allowed: T[]): T | null {
  if (!val || typeof val !== 'string') return null;
  const upper = val.trim().toUpperCase() as T;
  return allowed.includes(upper) ? upper : null;
}

export const excelLandedCostRowSchema = z
  .object({
    rowNumber: z.number().int(),
    countryCode: z
      .string()
      .trim()
      .toUpperCase()
      .min(2, 'Country code must be 2 letters')
      .max(2, 'Country code must be 2 letters'),
    boxSizeLabel: z.string().trim().min(1, 'Box size is required'),
    material: z.enum(['KRAFT', 'WHITE'] as const),
    print: z.enum(['PLAIN', 'PRINTED'] as const),
    qtyTierMin: z.number().int().min(0, 'Qty min must be >= 0'),
    qtyTierMax: z.number().int().nullable().optional(),
    costEur: z.number().positive('Cost in EUR must be greater than 0').max(100, 'Cost in EUR seems abnormally high (> 100)'),
  })
  .refine((d) => d.qtyTierMax === null || d.qtyTierMax === undefined || d.qtyTierMax > d.qtyTierMin, {
    message: 'Qty tier max must be greater than qty tier min',
    path: ['qtyTierMax'],
  });

export const excelPricingRuleRowSchema = z
  .object({
    rowNumber: z.number().int(),
    scope: z.enum(['GLOBAL', 'COUNTRY', 'PRODUCT'] as const),
    countryCode: z.string().trim().toUpperCase().nullable().optional(),
    boxSizeLabel: z.string().trim().nullable().optional(),
    markupMin: z
      .number()
      .min(MIN_MARKUP, `Minimum markup cannot be less than ${(MIN_MARKUP * 100).toFixed(0)}% (0.15)`)
      .max(MAX_MARKUP, `Minimum markup cannot exceed ${(MAX_MARKUP * 100).toFixed(0)}% (0.45)`),
    markupMax: z
      .number()
      .min(MIN_MARKUP, `Maximum markup cannot be less than ${(MIN_MARKUP * 100).toFixed(0)}% (0.15)`)
      .max(MAX_MARKUP, `Maximum markup cannot exceed ${(MAX_MARKUP * 100).toFixed(0)}% (0.45)`),
  })
  .refine((d) => d.markupMax >= d.markupMin, {
    message: 'Markup max must be greater than or equal to markup min',
    path: ['markupMax'],
  })
  .refine(
    (d) => {
      if (d.scope === 'COUNTRY' && (!d.countryCode || d.countryCode.length !== 2)) return false;
      if (d.scope === 'PRODUCT' && (!d.countryCode || !d.boxSizeLabel)) return false;
      return true;
    },
    {
      message: 'Country code and box size are required based on the rule scope',
      path: ['scope'],
    }
  );

export const excelPublicPriceRangeRowSchema = z
  .object({
    rowNumber: z.number().int(),
    countryCode: z.string().trim().toUpperCase().min(2).max(2),
    boxSizeLabel: z.string().trim().min(1, 'Box size is required'),
    material: z.enum(['KRAFT', 'WHITE'] as const),
    print: z.enum(['PLAIN', 'PRINTED'] as const),
    minEur: z.number().positive('Min EUR must be > 0'),
    maxEur: z.number().positive('Max EUR must be > 0'),
  })
  .refine((d) => d.maxEur >= d.minEur, {
    message: 'Max EUR must be greater than or equal to Min EUR',
    path: ['maxEur'],
  });
