import { describe, it, expect } from 'vitest';
import {
  step1CompanySchema,
  step2SpecsSchema,
  step3LogisticsSchema,
  step4ReviewSchema,
  quoteSubmissionPayloadSchema,
  parseBranchRange,
} from '../quoteRequest';

describe('parseBranchRange', () => {
  it('correctly maps branch ranges to min/max', () => {
    expect(parseBranchRange('1-5')).toEqual({ range: '1-5', min: 1, max: 5 });
    expect(parseBranchRange('6-20')).toEqual({ range: '6-20', min: 6, max: 20 });
    expect(parseBranchRange('21-50')).toEqual({ range: '21-50', min: 21, max: 50 });
    expect(parseBranchRange('50+')).toEqual({ range: '50+', min: 50, max: null });
  });
});

describe('quoteRequest validation schemas', () => {
  it('validates Step 1 company info correctly', () => {
    const valid = {
      fullName: 'Marco Rossi',
      companyName: 'Pizza Planet EU',
      jobTitle: 'Procurement Director',
      workEmail: 'm.rossi@pizzaplanet.eu',
      phoneNumber: '+39 02 1234 5678',
      branches: '21-50',
      websiteUrl: 'https://pizzaplanet.eu',
    };
    expect(step1CompanySchema.safeParse(valid).success).toBe(true);

    const invalidEmail = { ...valid, workEmail: 'not-an-email' };
    expect(step1CompanySchema.safeParse(invalidEmail).success).toBe(false);

    const shortName = { ...valid, fullName: 'M' };
    expect(step1CompanySchema.safeParse(shortName).success).toBe(false);
  });

  it('validates Step 2 standard and custom packaging specs', () => {
    const standardValid = {
      boxSpecificationType: 'STANDARD',
      standardBoxSize: '32cm',
      lengthMm: 320,
      widthMm: 320,
      heightMm: 40,
      material: 'kraft',
      printType: 'custom',
      monthlyVolume: 50000,
      customFlute: '',
      uploadTokens: [],
    };
    expect(step2SpecsSchema.safeParse(standardValid).success).toBe(true);

    const customValid = {
      boxSpecificationType: 'CUSTOM',
      lengthMm: 335,
      widthMm: 335,
      heightMm: 45,
      material: 'white',
      printType: 'plain',
      monthlyVolume: 25000,
      customFlute: 'E-Flute 150gsm',
      uploadTokens: ['123e4567-e89b-12d3-a456-426614174000'],
    };
    expect(step2SpecsSchema.safeParse(customValid).success).toBe(true);

    const invalidVolume = { ...standardValid, monthlyVolume: 0 };
    expect(step2SpecsSchema.safeParse(invalidVolume).success).toBe(false);

    const invalidDimensions = { ...customValid, lengthMm: 20 }; // below 50mm min
    expect(step2SpecsSchema.safeParse(invalidDimensions).success).toBe(false);
  });

  it('validates Step 3 logistics info', () => {
    const valid = {
      deliveryCountry: 'IT',
      deliveryCity: 'Milan',
      deliveryFrequency: 'Bi-weekly Pallet Drops',
      hasLoadingDock: true,
      deliveryAccessNotes: 'Gate 4, ring bell upon arrival',
    };
    expect(step3LogisticsSchema.safeParse(valid).success).toBe(true);

    const emptyCity = { ...valid, deliveryCity: '' };
    expect(step3LogisticsSchema.safeParse(emptyCity).success).toBe(false);
  });

  it('validates Step 4 review, honeypot, and idempotency key', () => {
    const valid = {
      notes: 'Please quote delivery to hub in Milan.',
      _hp_company_fax_: '',
      formMountedAt: Date.now() - 5000,
      idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
    };
    expect(step4ReviewSchema.safeParse(valid).success).toBe(true);

    const honeypotBot = { ...valid, _hp_company_fax_: 'bot-filled-value' };
    expect(step4ReviewSchema.safeParse(honeypotBot).success).toBe(false);

    const invalidIdempotency = { ...valid, idempotencyKey: 'not-a-uuid' };
    expect(step4ReviewSchema.safeParse(invalidIdempotency).success).toBe(false);
  });

  it('validates complete combined submission payload', () => {
    const fullValid = {
      fullName: 'Marco Rossi',
      companyName: 'Pizza Planet EU',
      jobTitle: 'Procurement Director',
      workEmail: 'm.rossi@pizzaplanet.eu',
      phoneNumber: '+39 02 1234 5678',
      branches: '21-50',
      websiteUrl: 'https://pizzaplanet.eu',
      boxSpecificationType: 'STANDARD',
      standardBoxSize: '32cm',
      lengthMm: 320,
      widthMm: 320,
      heightMm: 40,
      material: 'kraft',
      printType: 'custom',
      monthlyVolume: 50000,
      customFlute: '',
      uploadTokens: ['123e4567-e89b-12d3-a456-426614174000'],
      deliveryCountry: 'IT',
      deliveryCity: 'Milan',
      deliveryFrequency: 'Bi-weekly Pallet Drops',
      hasLoadingDock: true,
      deliveryAccessNotes: '',
      notes: 'Looking forward to the quotation.',
      _hp_company_fax_: '',
      formMountedAt: Date.now() - 10000,
      idempotencyKey: '123e4567-e89b-12d3-a456-426614174000',
      calcState: {
        country: 'IT',
        boxSize: '32cm',
        material: 'kraft',
        print: 'custom',
        boxesPerOrder: 5000,
        monthlyVolume: 50000,
        currentPrice: 0.35,
      },
    };

    expect(quoteSubmissionPayloadSchema.safeParse(fullValid).success).toBe(true);
  });
});
