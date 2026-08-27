import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';

export interface GenerateWorkbookOptions {
  type: 'current' | 'blank';
  injectedData?: {
    landedCosts: Array<{
      id?: string;
      effectiveFrom?: string;
      countryCode: string;
      sizeLabel: string;
      material: string;
      print: string;
      qtyTierMin: number;
      qtyTierMax: number | null;
      costEur: number;
    }>;
    pricingRules: Array<{
      id?: string;
      effectiveFrom?: string;
      scope: string;
      countryCode?: string | null;
      boxSizeLabel?: string | null;
      markupMin: number;
      markupMax: number;
    }>;
    publicRanges?: Array<{
      id?: string;
      effectiveFrom?: string;
      countryCode: string;
      sizeLabel: string;
      material: string;
      print: string;
      minEur: number;
      maxEur: number;
    }>;
  };
}

/**
 * Generates an Excel (.xlsx) buffer containing the Landed Costs, Pricing Rules,
 * Public Price Ranges, and Reference Instructions.
 *
 * In 'current' mode, includes Record ID and Version Timestamp for stable record tracking
 * and optimistic version conflict detection during UPDATE_EXISTING imports.
 */
export async function generatePricingWorkbook(opts: GenerateWorkbookOptions): Promise<Buffer> {
  const wb = XLSX.utils.book_new();

  let landedCostRows: (string | number)[][] = [];
  let pricingRuleRows: (string | number)[][] = [];
  let publicRangeRows: (string | number)[][] = [];

  if (opts.type === 'current') {
    if (opts.injectedData) {
      landedCostRows = opts.injectedData.landedCosts.map((l) => [
        l.id || '',
        l.effectiveFrom || new Date().toISOString(),
        l.countryCode,
        l.sizeLabel,
        l.material,
        l.print,
        l.qtyTierMin,
        l.qtyTierMax ?? '',
        l.costEur,
      ]);
      pricingRuleRows = opts.injectedData.pricingRules.map((r) => [
        r.id || '',
        r.effectiveFrom || new Date().toISOString(),
        r.scope,
        r.countryCode || '',
        r.boxSizeLabel || '',
        r.markupMin,
        r.markupMax,
      ]);
      publicRangeRows = (opts.injectedData.publicRanges || []).map((p) => [
        p.id || '',
        p.effectiveFrom || new Date().toISOString(),
        p.countryCode,
        p.sizeLabel,
        p.material,
        p.print,
        p.minEur,
        p.maxEur,
      ]);
    } else {
      // 1. Fetch current active landed costs
      const landedCosts = await prisma.landedCost.findMany({
        where: { active: true },
        include: { country: true, boxConfig: true },
        orderBy: [
          { country: { code: 'asc' } },
          { boxConfig: { sizeLabel: 'asc' } },
          { qtyTierMin: 'asc' },
        ],
      });

      landedCostRows = landedCosts.map((l) => [
        l.id,
        l.effectiveFrom.toISOString(),
        l.country.code,
        l.boxConfig.sizeLabel,
        l.boxConfig.material,
        l.boxConfig.print,
        l.qtyTierMin,
        l.qtyTierMax ?? '',
        Number(l.costEur),
      ]);

      // 2. Fetch current active pricing rules
      const pricingRules = await prisma.pricingRule.findMany({
        where: { active: true },
        include: { country: true, boxConfig: true },
        orderBy: [{ scope: 'asc' }, { country: { code: 'asc' } }],
      });

      pricingRuleRows = pricingRules.map((r) => [
        r.id,
        r.effectiveFrom.toISOString(),
        r.scope,
        r.country?.code || '',
        r.boxConfig?.sizeLabel || '',
        Number(r.markupMin),
        Number(r.markupMax),
      ]);

      // 3. Fetch current active public price ranges
      const publicRanges = await prisma.publicPriceRange.findMany({
        where: { active: true },
        orderBy: [{ countryId: 'asc' }],
      });

      const countries = await prisma.country.findMany();
      const boxConfigs = await prisma.boxConfig.findMany();
      const countryMap = new Map(countries.map((c) => [c.id, c.code]));
      const boxMap = new Map(boxConfigs.map((b) => [b.id, b]));

      publicRangeRows = publicRanges.map((p) => {
        const box = boxMap.get(p.boxConfigId);
        const cCode = countryMap.get(p.countryId) || '';
        return [
          p.id,
          p.effectiveFrom.toISOString(),
          cCode,
          box?.sizeLabel || '',
          box?.material || '',
          box?.print || '',
          Number(p.minEur),
          Number(p.maxEur),
        ];
      });
    }

    // Build Sheet 1: Landed Costs (with Record ID & Version Timestamp)
    const landedCostHeaders = [
      'Record ID (Do not edit)',
      'Version Timestamp',
      'Country Code',
      'Box Size Label',
      'Material (KRAFT/WHITE)',
      'Print (PLAIN/PRINTED)',
      'Qty Tier Min',
      'Qty Tier Max (Optional)',
      'Landed Cost EUR',
    ];
    const wsLanded = XLSX.utils.aoa_to_sheet([landedCostHeaders, ...landedCostRows]);
    wsLanded['!cols'] = [
      { wch: 28 },
      { wch: 26 },
      { wch: 14 },
      { wch: 18 },
      { wch: 24 },
      { wch: 22 },
      { wch: 14 },
      { wch: 22 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsLanded, 'Landed Costs');

    // Build Sheet 2: Pricing Rules
    const pricingRuleHeaders = [
      'Record ID (Do not edit)',
      'Version Timestamp',
      'Scope (GLOBAL/COUNTRY/PRODUCT)',
      'Country Code (Optional)',
      'Box Size Label (Optional)',
      'Min Markup (e.g. 0.20 or 20%)',
      'Max Markup (e.g. 0.35 or 35%)',
    ];
    const wsRules = XLSX.utils.aoa_to_sheet([pricingRuleHeaders, ...pricingRuleRows]);
    wsRules['!cols'] = [
      { wch: 28 },
      { wch: 26 },
      { wch: 30 },
      { wch: 24 },
      { wch: 24 },
      { wch: 30 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsRules, 'Pricing Rules');

    // Build Sheet 3: Public Price Ranges
    const publicRangeHeaders = [
      'Record ID (Do not edit)',
      'Version Timestamp',
      'Country Code',
      'Box Size Label',
      'Material (KRAFT/WHITE)',
      'Print (PLAIN/PRINTED)',
      'Min Price EUR',
      'Max Price EUR',
    ];
    const wsPublic = XLSX.utils.aoa_to_sheet([publicRangeHeaders, ...publicRangeRows]);
    wsPublic['!cols'] = [
      { wch: 28 },
      { wch: 26 },
      { wch: 14 },
      { wch: 18 },
      { wch: 24 },
      { wch: 22 },
      { wch: 16 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsPublic, 'Public Price Overrides');
  } else {
    // Blank template for ADD_NEW mode (without Record IDs)
    landedCostRows = [
      ['DE', '32cm', 'KRAFT', 'PLAIN', 10000, 25000, 0.185],
      ['FR', '33cm (13-inch)', 'WHITE', 'PRINTED', 25000, '', 0.215],
      ['IT', '28cm (10-inch)', 'KRAFT', 'PLAIN', 5000, 10000, 0.165],
    ];

    pricingRuleRows = [
      ['GLOBAL', '', '', 0.2, 0.35],
      ['COUNTRY', 'DE', '', 0.22, 0.38],
      ['PRODUCT', 'DE', '33cm (13-inch)', 0.25, 0.4],
    ];

    publicRangeRows = [
      ['DE', '32cm', 'KRAFT', 'PLAIN', 0.22, 0.28],
      ['FR', '33cm (13-inch)', 'WHITE', 'PRINTED', 0.26, 0.33],
    ];

    const landedCostHeaders = [
      'Country Code',
      'Box Size Label',
      'Material (KRAFT/WHITE)',
      'Print (PLAIN/PRINTED)',
      'Qty Tier Min',
      'Qty Tier Max (Optional)',
      'Landed Cost EUR',
    ];
    const wsLanded = XLSX.utils.aoa_to_sheet([landedCostHeaders, ...landedCostRows]);
    wsLanded['!cols'] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 24 },
      { wch: 22 },
      { wch: 14 },
      { wch: 22 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsLanded, 'Landed Costs');

    const pricingRuleHeaders = [
      'Scope (GLOBAL/COUNTRY/PRODUCT)',
      'Country Code (Optional)',
      'Box Size Label (Optional)',
      'Min Markup (e.g. 0.20 or 20%)',
      'Max Markup (e.g. 0.35 or 35%)',
    ];
    const wsRules = XLSX.utils.aoa_to_sheet([pricingRuleHeaders, ...pricingRuleRows]);
    wsRules['!cols'] = [
      { wch: 30 },
      { wch: 24 },
      { wch: 24 },
      { wch: 30 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsRules, 'Pricing Rules');

    const publicRangeHeaders = [
      'Country Code',
      'Box Size Label',
      'Material (KRAFT/WHITE)',
      'Print (PLAIN/PRINTED)',
      'Min Price EUR',
      'Max Price EUR',
    ];
    const wsPublic = XLSX.utils.aoa_to_sheet([publicRangeHeaders, ...publicRangeRows]);
    wsPublic['!cols'] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 24 },
      { wch: 22 },
      { wch: 16 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsPublic, 'Public Price Overrides');
  }

  // Build Sheet 4: Instructions & Reference
  const instructions = [
    ['OpsVale Bulk Pricing Management Instructions'],
    [''],
    ['Import Modes & Governance:'],
    ['1. UPDATE_EXISTING Mode: Download the live config matrix, edit existing numbers, and upload. Stable Record IDs & Version Timestamps prevent overwrite conflicts if another admin modified the database concurrently.'],
    ['2. ADD_NEW Mode: Download the blank template to define new box configurations or territory routes. Avoids accidental duplicate entries.'],
    [''],
    ['Rules & Guidance:'],
    ['1. Country Code: Must be a valid 2-letter ISO country code (e.g. DE, FR, IT, ES, NL, BE, AT, PL, UK, US).'],
    ['2. Material: Must be either KRAFT or WHITE (case-insensitive).'],
    ['3. Print: Must be either PLAIN or PRINTED (case-insensitive).'],
    ['4. Markup Hierarchy: Markup values must be between 15% (0.15) and 45% (0.45). Max Markup must be >= Min Markup.'],
    ['5. Landed Costs: Must be positive numbers in EUR (e.g. 0.1850).'],
    ['6. Quantity Tiers: Tier Max must be greater than Tier Min, or left blank for unbounded upper tiers (e.g. 50,000+).'],
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions & Reference');

  const fileBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(fileBuffer);
}
