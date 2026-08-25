import { AdminQuotesList } from '@/components/admin/AdminQuotesList';
import { INITIAL_LEADS } from '@/lib/mockData';

export default function AdminQuotes() {
  return <AdminQuotesList leads={INITIAL_LEADS} />;
}
