import { notFound } from 'next/navigation';
import { LeadDetailView } from '@/components/admin/LeadDetailView';
import { INITIAL_LEADS } from '@/lib/mockData';

export default async function LeadDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = INITIAL_LEADS.find((l) => l.id === id);

  if (!lead) {
    notFound();
  }

  return <LeadDetailView lead={lead} />;
}
