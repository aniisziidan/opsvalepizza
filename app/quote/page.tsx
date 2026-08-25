import { z } from 'zod';
import { TopNavBar } from '@/components/TopNavBar';
import { Footer } from '@/components/Footer';
import { MultiStepQuotePage } from '@/components/MultiStepQuotePage';
import type { CalculatorState } from '@/lib/types';

// Validate the incoming query string into a valid CalculatorState.
// Each field falls back to a sensible default when missing or malformed,
// so a bad URL (e.g. ?boxSize=99cm&currentPrice=abc) can never crash the page.
const calcStateSchema = z.object({
  country: z.string().min(1).catch('IT'),
  boxSize: z.enum(['28cm', '32cm', '40cm']).catch('32cm'),
  material: z.enum(['kraft', 'white']).catch('kraft'),
  print: z.enum(['plain', 'custom']).catch('custom'),
  boxesPerOrder: z.coerce.number().positive().catch(5000),
  monthlyVolume: z.coerce.number().positive().catch(50000),
  currentPrice: z.coerce.number().positive().catch(0.35),
}) satisfies z.ZodType<CalculatorState>;

export default async function Quote({
  searchParams,
}: {
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
}) {
  const sp = await searchParams;

  // If the user arrived from the calculator, prefill from the query string.
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
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col selection:bg-[#ffdeac] selection:text-[#281900]">
      <TopNavBar />
      <main className="flex-grow">
        <MultiStepQuotePage
          initialCalcState={initialCalcState}
          estimatedSavings={parsedSavings}
        />
      </main>
      <Footer />
    </div>
  );
}
