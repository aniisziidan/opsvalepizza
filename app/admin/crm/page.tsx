import { CRMContactsList } from '@/components/admin/CRMContactsList';
import { getCRMContactsSummary } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

export default async function AdminCRMPage() {
  const data = await getCRMContactsSummary({ page: 1, pageSize: 50 });
  return <CRMContactsList initialData={data} />;
}
