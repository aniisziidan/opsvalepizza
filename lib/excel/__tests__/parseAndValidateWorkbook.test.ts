import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parsePricingWorkbook } from '../parseWorkbook';
import { normalizeNumber, normalizeEnum } from '../validation';

describe('normalizeNumber & normalizeEnum', () => {
  it('normalizes percentage strings to decimals', () => {
    expect(normalizeNumber('25%')).toBe(0.25);
    expect(normalizeNumber('30 %')).toBe(0.3);
    expect(normalizeNumber('0.22')).toBe(0.22);
    expect(normalizeNumber(0.35)).toBe(0.35);
  });

  it('normalizes currency strings to numbers', () => {
    expect(normalizeNumber('€0.1850')).toBe(0.185);
    expect(normalizeNumber('$ 12.50')).toBe(12.5);
    expect(normalizeNumber('')).toBeNull();
    expect(normalizeNumber(null)).toBeNull();
  });

  it('normalizes enums case-insensitively', () => {
    expect(normalizeEnum('kraft', ['KRAFT', 'WHITE'])).toBe('KRAFT');
    expect(normalizeEnum('PRINTED', ['PLAIN', 'PRINTED'])).toBe('PRINTED');
    expect(normalizeEnum('invalid', ['KRAFT', 'WHITE'])).toBeNull();
  });
});

describe('parsePricingWorkbook', () => {
  it('correctly parses a well-formatted workbook buffer', () => {
    const wb = XLSX.utils.book_new();

    const wsLanded = XLSX.utils.aoa_to_sheet([
      ['Country Code', 'Box Size Label', 'Material', 'Print', 'Qty Tier Min', 'Qty Tier Max', 'Landed Cost EUR'],
      ['DE', '32cm', 'KRAFT', 'PLAIN', 10000, 25000, 0.185],
      ['FR', '33cm', 'WHITE', 'PRINTED', 25000, '', '€0.2150'],
    ]);
    XLSX.utils.book_append_sheet(wb, wsLanded, 'Landed Costs');

    const wsRules = XLSX.utils.aoa_to_sheet([
      ['Scope', 'Country Code', 'Box Size Label', 'Min Markup', 'Max Markup'],
      ['GLOBAL', '', '', '20%', '35%'],
      ['COUNTRY', 'DE', '', 0.22, 0.38],
    ]);
    XLSX.utils.book_append_sheet(wb, wsRules, 'Pricing Rules');

    const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    const result = parsePricingWorkbook(buffer);

    expect(result.errors).toHaveLength(0);
    expect(result.landedCosts).toHaveLength(2);
    expect(result.landedCosts[0].countryCode).toBe('DE');
    expect(result.landedCosts[0].costEur).toBe(0.185);
    expect(result.landedCosts[1].costEur).toBe(0.215);

    expect(result.pricingRules).toHaveLength(2);
    expect(result.pricingRules[0].scope).toBe('GLOBAL');
    expect(result.pricingRules[0].markupMin).toBe(0.2);
    expect(result.pricingRules[0].markupMax).toBe(0.35);
  });

  it('captures row validation errors for invalid numbers and missing fields', () => {
    const wb = XLSX.utils.book_new();

    const wsLanded = XLSX.utils.aoa_to_sheet([
      ['Country Code', 'Box Size Label', 'Material', 'Print', 'Qty Tier Min', 'Qty Tier Max', 'Landed Cost EUR'],
      ['DE', '32cm', 'INVALID_MAT', 'PLAIN', 10000, 5000, 0], // tierMax < tierMin and cost = 0
    ]);
    XLSX.utils.book_append_sheet(wb, wsLanded, 'Landed Costs');

    const wsRules = XLSX.utils.aoa_to_sheet([
      ['Scope', 'Country Code', 'Box Size Label', 'Min Markup', 'Max Markup'],
      ['GLOBAL', '', '', '10%', '60%'], // out of 15%-45% range
    ]);
    XLSX.utils.book_append_sheet(wb, wsRules, 'Pricing Rules');

    const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    const result = parsePricingWorkbook(buffer);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.landedCosts).toHaveLength(0);
  });
});
