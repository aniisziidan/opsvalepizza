import { RuleScope, Material, PrintType, CostSource } from '@prisma/client';

export type DiffAction = 'INSERT' | 'UPDATE' | 'UNCHANGED' | 'INVALID' | 'CONFLICT';

export type ImportMode = 'UPDATE_EXISTING' | 'ADD_NEW' | 'AUTO';

export interface RowValidationError {
  sheet: string;
  rowNumber: number;
  field: string;
  value: any;
  message: string;
  isConflict?: boolean;
}

export interface ParsedLandedCostRow {
  rowNumber: number;
  recordId?: string | null;
  versionTimestamp?: string | null;
  countryCode: string;
  boxSizeLabel: string;
  material: Material;
  print: PrintType;
  qtyTierMin: number;
  qtyTierMax: number | null;
  costEur: number;
  source?: CostSource;
}

export interface LandedCostDiffItem {
  action: DiffAction;
  rowNumber: number;
  recordId?: string | null;
  countryCode: string;
  countryName?: string;
  boxSizeLabel: string;
  material: Material;
  print: PrintType;
  qtyTierMin: number;
  qtyTierMax: number | null;
  newCostEur: number;
  oldCostEur?: number | null;
  existingId?: string;
  versionConflict?: boolean;
  errors?: string[];
}

export interface ParsedPricingRuleRow {
  rowNumber: number;
  recordId?: string | null;
  versionTimestamp?: string | null;
  scope: RuleScope;
  countryCode?: string | null;
  boxSizeLabel?: string | null;
  material?: Material | null;
  print?: PrintType | null;
  markupMin: number;
  markupMax: number;
}

export interface PricingRuleDiffItem {
  action: DiffAction;
  rowNumber: number;
  recordId?: string | null;
  scope: RuleScope;
  countryCode?: string | null;
  countryName?: string | null;
  boxSizeLabel?: string | null;
  newMarkupMin: number;
  newMarkupMax: number;
  oldMarkupMin?: number | null;
  oldMarkupMax?: number | null;
  existingId?: string;
  versionConflict?: boolean;
  errors?: string[];
}

export interface ParsedPublicPriceRangeRow {
  rowNumber: number;
  recordId?: string | null;
  versionTimestamp?: string | null;
  countryCode: string;
  boxSizeLabel: string;
  material: Material;
  print: PrintType;
  minEur: number;
  maxEur: number;
}

export interface PublicPriceRangeDiffItem {
  action: DiffAction;
  rowNumber: number;
  recordId?: string | null;
  countryCode: string;
  countryName?: string;
  boxSizeLabel: string;
  material: Material;
  print: PrintType;
  newMinEur: number;
  newMaxEur: number;
  oldMinEur?: number | null;
  oldMaxEur?: number | null;
  existingId?: string;
  versionConflict?: boolean;
  errors?: string[];
}

export interface ExcelPreviewSummary {
  totalRows: number;
  insertsCount: number;
  updatesCount: number;
  unchangedCount: number;
  conflictsCount: number;
  errorsCount: number;
}

export interface ExcelPreviewResult {
  fileName: string;
  importMode: ImportMode;
  summary: ExcelPreviewSummary;
  landedCosts: LandedCostDiffItem[];
  pricingRules: PricingRuleDiffItem[];
  publicPriceRanges: PublicPriceRangeDiffItem[];
  errors: RowValidationError[];
  canCommit: boolean;
}

export interface BulkCommitPayload {
  importMode?: ImportMode;
  landedCosts: Array<{
    recordId?: string | null;
    countryCode: string;
    boxSizeLabel: string;
    material: Material;
    print: PrintType;
    qtyTierMin: number;
    qtyTierMax: number | null;
    costEur: number;
    action: 'INSERT' | 'UPDATE';
  }>;
  pricingRules: Array<{
    recordId?: string | null;
    scope: RuleScope;
    countryCode?: string | null;
    boxSizeLabel?: string | null;
    markupMin: number;
    markupMax: number;
    action: 'INSERT' | 'UPDATE';
  }>;
  publicPriceRanges: Array<{
    recordId?: string | null;
    countryCode: string;
    boxSizeLabel: string;
    material: Material;
    print: PrintType;
    minEur: number;
    maxEur: number;
    action: 'INSERT' | 'UPDATE';
  }>;
}

export interface BulkCommitResult {
  success: boolean;
  message: string;
  counts: {
    landedCostsCreated: number;
    pricingRulesCreated: number;
    publicRangesCreated: number;
    totalAudited: number;
  };
}
