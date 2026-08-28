import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getVisitorIntelligenceData } from '@/lib/analytics/queries';
import { formatAnalyticsAsCsv } from '@/lib/analytics/export';
import { DateRangePreset } from '@/lib/analytics/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = req.nextUrl.searchParams;
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const section = (searchParams.get('section') || 'summary').toLowerCase();
    const range = (searchParams.get('range') || '30D').toUpperCase() as DateRangePreset;
    const country = searchParams.get('country') || undefined;
    const locale = searchParams.get('locale') || undefined;

    const data = await getVisitorIntelligenceData({
      range,
      country,
      locale,
    });

    if (format === 'json') {
      return NextResponse.json(data, {
        headers: {
          'Content-Disposition': `attachment; filename="opsvale-visitor-analytics-${range.toLowerCase()}.json"`,
        },
      });
    }

    const csvContent = formatAnalyticsAsCsv(data, section);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="opsvale-${section}-${range.toLowerCase()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Unauthorized or export error' },
      { status: 401 }
    );
  }
}
