import { z } from 'zod';

export const BRANCH_RANGES = ['1-5', '6-20', '21-50', '50+'] as const;
export type BranchRange = (typeof BRANCH_RANGES)[number];

export const parseBranchRange = (
  val: string,
): { range: string; min: number; max: number | null } => {
  switch (val) {
    case '1-5':
      return { range: '1-5', min: 1, max: 5 };
    case '6-20':
      return { range: '6-20', min: 6, max: 20 };
    case '21-50':
      return { range: '21-50', min: 21, max: 50 };
    case '50+':
      return { range: '50+', min: 50, max: null };
    default:
      return { range: '1-5', min: 1, max: 5 };
  }
};

// Standard preset sizes lookup in mm
export const STANDARD_SIZES_MM: Record<
  string,
  { label: string; lengthMm: number; widthMm: number; heightMm: number }
> = {
  '28cm': { label: '28cm', lengthMm: 280, widthMm: 280, heightMm: 40 },
  '32cm': { label: '32cm', lengthMm: 320, widthMm: 320, heightMm: 40 },
  '40cm': { label: '40cm', lengthMm: 400, widthMm: 400, heightMm: 45 },
};

// Step 1: Company Information
export const step1CompanySchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required (min 2 characters)'),
  companyName: z.string().trim().min(2, 'Company name is required (min 2 characters)'),
  jobTitle: z.string().trim().max(100).optional().default(''),
  workEmail: z.string().trim().email('Valid business email is required'),
  phoneNumber: z.string().trim().min(5, 'Valid phone number is required'),
  branches: z.enum(BRANCH_RANGES, {
    message: 'Please select number of branches',
  }),
  websiteUrl: z
    .string()
    .trim()
    .max(255)
    .optional()
    .refine(
      (val) => !val || /^https?:\/\//i.test(val) || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(val),
      'Please enter a valid website URL',
    )
    .default(''),
});
export type Step1CompanyInput = z.infer<typeof step1CompanySchema>;

// Step 2: Packaging Specifications (Standard or Custom Dimensions)
export const step2SpecsSchema = z.object({
  boxSpecificationType: z.enum(['STANDARD', 'CUSTOM']).default('STANDARD'),
  standardBoxSize: z.string().optional(),
  lengthMm: z.coerce
    .number()
    .int('Length must be a whole number')
    .min(50, 'Length must be at least 50mm')
    .max(1000, 'Length must be at most 1000mm'),
  widthMm: z.coerce
    .number()
    .int('Width must be a whole number')
    .min(50, 'Width must be at least 50mm')
    .max(1000, 'Width must be at most 1000mm'),
  heightMm: z.coerce
    .number()
    .int('Height must be a whole number')
    .min(15, 'Height must be at least 15mm')
    .max(200, 'Height must be at most 200mm'),
  material: z.enum(['kraft', 'white'], {
    message: 'Please select material preference',
  }),
  printType: z.enum(['plain', 'custom'], {
    message: 'Please select print requirement',
  }),
  monthlyVolume: z.coerce
    .number()
    .int('Volume must be a whole number')
    .positive('Estimated monthly volume must be greater than 0'),
  customFlute: z.string().trim().max(200).optional().default(''),
  uploadTokens: z.array(z.string().uuid()).max(5, 'Maximum 5 uploaded files allowed').default([]),
});
export type Step2SpecsInput = z.infer<typeof step2SpecsSchema>;

// Step 3: Logistics & Delivery
export const step3LogisticsSchema = z.object({
  deliveryCountry: z.string().trim().min(2, 'Destination country is required'),
  deliveryCity: z.string().trim().min(2, 'Destination city is required'),
  deliveryFrequency: z.string().trim().max(100).optional().default('Bi-weekly Pallet Drops'),
  hasLoadingDock: z.boolean().default(false),
  deliveryAccessNotes: z.string().trim().max(500).optional().default(''),
});
export type Step3LogisticsInput = z.infer<typeof step3LogisticsSchema>;

// Step 4: Review, Notes, Honeypot, Idempotency & Cooldown
export const step4ReviewSchema = z.object({
  notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters').optional().default(''),
  // Honeypot field: must remain empty; if filled, request was made by a bot
  _hp_company_fax_: z.string().max(0, 'Spam detected').optional().default(''),
  // Form mount timestamp in ms for cooldown calculation (> 2000ms expected)
  formMountedAt: z.coerce.number().positive(),
  // Client-generated UUID for idempotency
  idempotencyKey: z.string().uuid('Invalid submission idempotency key'),
});
export type Step4ReviewInput = z.infer<typeof step4ReviewSchema>;

// Raw calculator inputs (if passed forward from calculator page)
export const rawCalcStateSchema = z
  .object({
    country: z.string().min(1),
    boxSize: z.enum(['28cm', '32cm', '40cm']),
    material: z.enum(['kraft', 'white']),
    print: z.enum(['plain', 'custom']),
    boxesPerOrder: z.coerce.number().positive(),
    monthlyVolume: z.coerce.number().positive(),
    currentPrice: z.coerce.number().positive(),
  })
  .nullable()
  .optional();
export type RawCalcState = z.infer<typeof rawCalcStateSchema>;

// Complete Combined Submission Schema
export const quoteSubmissionPayloadSchema = step1CompanySchema
  .merge(step2SpecsSchema)
  .merge(step3LogisticsSchema)
  .merge(step4ReviewSchema)
  .extend({
    calcState: rawCalcStateSchema,
  });
export type QuoteSubmissionPayload = z.infer<typeof quoteSubmissionPayloadSchema>;
