import { TopNavBar } from '@/components/TopNavBar';
import { Footer } from '@/components/Footer';
import { MultiStepQuotePage } from '@/components/MultiStepQuotePage';
import type { CalculatorState } from '@/lib/types';

export default async function Quote({
  searchParams,
}: {
  searchParams: Promise<{
    country?: string;
    boxSize?: string;
    material?: string;
    print?: string;
    monthlyVolume?: string;
    savings?: string;
  }>;
}) {
  const sp = await searchParams;

  // If the user arrived from the calculator, prefill from the query string.
  let initialCalcState: CalculatorState | null = null;
  if (sp.boxSize || sp.monthlyVolume) {
    initialCalcState = {
      country: sp.country ?? 'IT',
      boxSize: (sp.boxSize as CalculatorState['boxSize']) ?? '32cm',
      material: (sp.material as CalculatorState['material']) ?? 'kraft',
      print: (sp.print as CalculatorState['print']) ?? 'custom',
      boxesPerOrder: 5000,
      monthlyVolume: sp.monthlyVolume ? parseInt(sp.monthlyVolume, 10) || 50000 : 50000,
      currentPrice: 0.35,
    };
  }

  const estimatedSavings = sp.savings ? parseInt(sp.savings, 10) || 12400 : 12400;

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col selection:bg-[#ffdeac] selection:text-[#281900]">
      <TopNavBar />
      <main className="flex-grow">
        <MultiStepQuotePage
          initialCalcState={initialCalcState}
          estimatedSavings={estimatedSavings}
        />
      </main>
      <Footer />
    </div>
  );
}
