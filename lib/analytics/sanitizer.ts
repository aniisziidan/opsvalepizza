import { AnalyticsEventType } from '@prisma/client';

const FORBIDDEN_PII_KEYS = new Set([
  'name',
  'email',
  'phone',
  'password',
  'notes',
  'address',
  'companyname',
  'contactname',
  'creditcard',
  'ssn',
  'vatnumber',
  'message',
]);

const ALLOWED_METADATA_FIELDS_BY_EVENT: Record<AnalyticsEventType, Set<string>> = {
  PAGE_VIEW: new Set(['title', 'referrer', 'viewportWidth', 'viewportHeight']),
  SESSION_START: new Set(['initialPath', 'referrer', 'userAgent']),
  CALCULATOR_OPENED: new Set(['source', 'trigger']),
  CALCULATOR_USED: new Set([
    'boxSize',
    'material',
    'print',
    'boxesPerOrder',
    'monthlyVolume',
    'currentPrice',
    'hasCustomParams',
  ]),
  CALCULATOR_COMPLETED: new Set([
    'boxSize',
    'material',
    'print',
    'boxesPerOrder',
    'monthlyVolume',
    'currentPrice',
    'estMinEur',
    'estMaxEur',
    'estYearlySavings',
    'currency',
  ]),
  QUOTE_PAGE_OPENED: new Set(['source', 'hasCalculatorSnapshot', 'boxSpecificationType']),
  QUOTE_REQUEST_STARTED: new Set(['step', 'specificationType', 'boxSize', 'quantity']),
  QUOTE_REQUEST_SUBMITTED: new Set([
    'specificationType',
    'boxSize',
    'material',
    'print',
    'quantity',
    'deliveryCountryCode',
    'deliveryCity',
    'hasFilesAttached',
  ]),
  PRODUCT_VIEWED: new Set(['productSize', 'material', 'print', 'category']),
  CTA_CLICKED: new Set(['ctaName', 'location', 'destinationUrl', 'variant']),
  PROPOSAL_PAGE_VIEWED: new Set(['tokenHash', 'revision']),
  PROPOSAL_ACCEPTED: new Set(['tokenHash', 'revision', 'hasPoNumber']),
  FILE_DOWNLOAD: new Set(['fileType', 'fileNameSanitized']),
};

export function sanitizeString(val: unknown, maxLen = 256): string | undefined {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

export function sanitizePath(rawPath: unknown): string {
  if (typeof rawPath !== 'string' || !rawPath.trim()) return '/';
  let clean = rawPath.trim();
  // Strip protocol and host if full URL passed
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      clean = new URL(clean).pathname;
    } catch {
      clean = '/';
    }
  }
  if (!clean.startsWith('/')) clean = `/${clean}`;
  return clean.slice(0, 256);
}

export function extractCanonicalPath(rawPath: string): string {
  const clean = sanitizePath(rawPath);
  // Strip locale prefix if present: /en, /de, /fr, /it, /es
  const localeMatch = clean.match(/^\/(en|de|fr|it|es)(\/.*)?$/);
  if (localeMatch) {
    const withoutLocale = localeMatch[2] || '/';
    return withoutLocale;
  }
  return clean;
}

export function sanitizeEventMetadata(
  eventType: AnalyticsEventType,
  rawMetadata: unknown
): Record<string, any> | undefined {
  if (!rawMetadata || typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) {
    return undefined;
  }

  const allowedKeys = ALLOWED_METADATA_FIELDS_BY_EVENT[eventType];
  if (!allowedKeys) return undefined;

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(rawMetadata as Record<string, any>)) {
    const lowerKey = key.toLowerCase();

    // Strict PII rejection
    if (FORBIDDEN_PII_KEYS.has(lowerKey)) {
      continue;
    }

    // Allowlist check
    if (allowedKeys.has(key)) {
      if (typeof value === 'string') {
        sanitized[key] = value.slice(0, 100);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}
