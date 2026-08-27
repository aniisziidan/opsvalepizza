import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { generatePricingWorkbook } from '../generateWorkbook';

describe('generatePricingWorkbook', () => {
  it('generates a valid blank template workbook with 4 sheets', async () => {
    const buffer = await generatePricingWorkbook({ type: 'blank' });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);

    const wb = XLSX.read(buffer, { type: 'buffer' });
    expect(wb.SheetNames).toContain('Landed Costs');
    expect(wb.SheetNames).toContain('Pricing Rules');
    expect(wb.SheetNames).toContain('Public Price Overrides');
    expect(wb.SheetNames).toContain('Instructions & Reference');

    const landedRows = XLSX.utils.sheet_to_json<any>(wb.Sheets['Landed Costs']);
    expect(landedRows.length).toBeGreaterThan(0);
    expect(landedRows[0]['Country Code']).toBeDefined();
  });

  it('generates a valid current config workbook from provided records', async () => {
    const buffer = await generatePricingWorkbook({
      type: 'current',
      injectedData: {
        landedCosts: [
          {
            countryCode: 'DE',
            sizeLabel: '32cm',
            material: 'KRAFT',
            print: 'PLAIN',
            qtyTierMin: 10000,
            qtyTierMax: 25000,
            costEur: 0.185,
          },
        ],
        pricingRules: [
          {
            scope: 'GLOBAL',
            countryCode: null,
            boxSizeLabel: null,
            markupMin: 0.2,
            markupMax: 0.35,
          },
        ],
      },
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);

    const wb = XLSX.read(buffer, { type: 'buffer' });
    expect(wb.SheetNames).toContain('Landed Costs');
    expect(wb.SheetNames).toContain('Pricing Rules');

    const landedRows = XLSX.utils.sheet_to_json<any>(wb.Sheets['Landed Costs']);
    expect(landedRows.length).toBe(1);
    expect(landedRows[0]['Country Code']).toBe('DE');
  });
});
