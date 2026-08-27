import { notFound } from 'next/navigation';
import { LeadDetailView } from '@/components/admin/LeadDetailView';
import { getLeadDetail } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadDetail(id);

  if (!lead) {
    notFound();
  }

  return <LeadDetailView lead={lead} />;
}
