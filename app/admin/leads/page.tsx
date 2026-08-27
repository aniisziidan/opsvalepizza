import { AdminLeadsList } from '@/components/admin/AdminLeadsList';
import { getLeadsSummary } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

export default async function AdminLeadsPage() {
  const data = await getLeadsSummary({ page: 1, pageSize: 50 });
  return <AdminLeadsList initialData={data} />;
}
