import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const logisticsCorridorSchema = z.object({
  countryId: z.string().min(1, 'Country is required'),
  route: z.string().trim().max(120).optional().nullable(),
  port: z.string().trim().max(120).optional().nullable(),
  shipMethod: z.string().trim().max(120).optional().nullable(),
  freightEur: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
    .refine((v) => v === null || v >= 0, 'Freight EUR must be >= 0'),
  inlandEur: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
    .refine((v) => v === null || v >= 0, 'Inland EUR must be >= 0'),
  otherEur: z
    .union([z.number(), z.string()])
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
    .refine((v) => v === null || v >= 0, 'Other EUR must be >= 0'),
});

describe('Logistics Corridor Schema Validation', () => {
  it('validates a correct logistics corridor input', () => {
    const valid = {
      countryId: 'cnt_germany',
      route: 'Rotterdam -> Rhine-Ruhr Corridor',
      port: 'Rotterdam ECT Terminal',
      shipMethod: 'Intermodal Rail + Road',
      freightEur: '0.0250',
      inlandEur: '0.0100',
      otherEur: '0.0050',
    };

    const parsed = logisticsCorridorSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.freightEur).toBe(0.025);
      expect(parsed.data.inlandEur).toBe(0.01);
      expect(parsed.data.otherEur).toBe(0.005);
    }
  });

  it('rejects missing countryId or negative rates', () => {
    const invalid = {
      countryId: '',
      freightEur: -0.05,
    };

    const parsed = logisticsCorridorSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});
