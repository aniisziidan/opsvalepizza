import { redirect } from 'next/navigation';

export default async function CalculatorRedirect({
  searchParams,
}: {
  searchParams: Promise<{ volume?: string }>;
}) {
  const sp = await searchParams;
  const query = sp.volume ? `?volume=${encodeURIComponent(sp.volume)}` : '';
  redirect(`/en/calculator${query}`);
}
