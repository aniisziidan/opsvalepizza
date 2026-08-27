import React from 'react';
import { z } from 'zod';
import { MultiStepQuotePage } from '@/components/MultiStepQuotePage';
import type { CalculatorState } from '@/lib/types';

const calcStateSchema = z.object({
  country: z.string().min(1).catch('IT'),
  boxSize: z.enum(['28cm', '32cm', '40cm']).catch('32cm'),
  material: z.enum(['kraft', 'white']).catch('kraft'),
  print: z.enum(['plain', 'custom']).catch('custom'),
  boxesPerOrder: z.coerce.number().positive().catch(5000),
  monthlyVolume: z.coerce.number().positive().catch(50000),
  currentPrice: z.coerce.number().positive().catch(0.35),
}) satisfies z.ZodType<CalculatorState>;

interface LocalizedQuoteProps {
  searchParams: Promise<{
    country?: string;
    boxSize?: string;
    material?: string;
    print?: string;
    monthlyVolume?: string;
    boxesPerOrder?: string;
    currentPrice?: string;
    savings?: string;
  }>;
}

export default async function LocalizedQuotePage({ searchParams }: LocalizedQuoteProps) {
  const sp = await searchParams;

  let initialCalcState: CalculatorState | null = null;
  if (sp.boxSize || sp.monthlyVolume) {
    initialCalcState = calcStateSchema.parse({
      country: sp.country,
      boxSize: sp.boxSize,
      material: sp.material,
      print: sp.print,
      boxesPerOrder: sp.boxesPerOrder,
      monthlyVolume: sp.monthlyVolume,
      currentPrice: sp.currentPrice,
    });
  }

  const parsedSavings = z.coerce.number().positive().catch(12400).parse(sp.savings);

  return (
    <MultiStepQuotePage
      initialCalcState={initialCalcState}
      estimatedSavings={parsedSavings}
    />
  );
}
