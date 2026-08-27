import { QuotesList } from '@/components/admin/QuotesList';
import { getQuotesList } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

interface AdminQuotesPageProps {
  searchParams: Promise<{ status?: string; search?: string }>;
}

export default async function AdminQuotesPage({ searchParams }: AdminQuotesPageProps) {
  const { status, search } = await searchParams;
  const quotes = await getQuotesList({ status, search });

  return (
    <QuotesList
      quotes={quotes}
      currentFilter={status || 'ALL'}
      currentSearch={search || ''}
    />
  );
}
