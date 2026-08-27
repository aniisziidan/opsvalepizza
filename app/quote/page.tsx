import { redirect } from 'next/navigation';

export default async function QuoteRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v) params.append(k, v);
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  redirect(`/en/quote${query}`);
}
