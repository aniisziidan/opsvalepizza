import { TopNavBar } from '@/components/TopNavBar';
import { Footer } from '@/components/Footer';
import { SavingsCalculatorPage } from '@/components/SavingsCalculatorPage';

export default async function Calculator({
  searchParams,
}: {
  searchParams: Promise<{ volume?: string }>;
}) {
  const { volume } = await searchParams;
  const initialVolume = volume ? parseInt(volume, 10) || 20000 : 20000;

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col selection:bg-[#ffdeac] selection:text-[#281900]">
      <TopNavBar />
      <main className="flex-grow">
        <SavingsCalculatorPage initialVolume={initialVolume} />
      </main>
      <Footer />
    </div>
  );
}
