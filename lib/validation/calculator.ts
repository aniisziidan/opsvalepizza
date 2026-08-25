import { z } from 'zod';

export const calculatorInputSchema = z.object({
  countryCode: z.string().length(2),
  boxSize: z.enum(['28cm', '32cm', '40cm']),
  material: z.enum(['kraft', 'white']),
  print: z.enum(['plain', 'custom']),
  boxesPerOrder: z.coerce.number().int().positive(),
  monthlyVolume: z.coerce.number().int().positive(),
  currentPrice: z.coerce.number().positive(),
});

export type CalculatorInput = z.infer<typeof calculatorInputSchema>;
