import React from 'react';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getVisitorIntelligenceData } from '@/lib/analytics/queries';
import { VisitorsIntelligenceView } from '@/components/admin/VisitorsIntelligenceView';
import { DateRangePreset } from '@/lib/analytics/types';

export const dynamic = 'force-dynamic';

interface VisitorsPageProps {
  searchParams: Promise<{
    range?: string;
    country?: string;
    locale?: string;
    source?: string;
    device?: string;
    campaign?: string;
  }>;
}

export default async function AdminVisitorsPage({ searchParams }: VisitorsPageProps) {
  await requireAdmin();
  const params = await searchParams;

  const range = (params.range || '30D').toUpperCase() as DateRangePreset;
  const country = params.country || undefined;
  const locale = params.locale || undefined;
  const source = params.source || undefined;
  const device = params.device || undefined;
  const campaign = params.campaign || undefined;

  const data = await getVisitorIntelligenceData({
    range,
    country,
    locale,
    source,
    device,
    campaign,
  });

  return (
    <React.Suspense fallback={<div className="p-10 text-[#75777e] font-mono-data text-xs">Loading Visitor Intelligence...</div>}>
      <VisitorsIntelligenceView data={data} />
    </React.Suspense>
  );
}
