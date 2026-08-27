import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { generatePricingWorkbook } from '@/lib/excel/generateWorkbook';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get('type') === 'blank' ? 'blank' : 'current';

    const buffer = await generatePricingWorkbook({ type: typeParam });

    const filename =
      typeParam === 'blank'
        ? `OpsVale_Pricing_Template_Blank_${new Date().toISOString().slice(0, 10)}.xlsx`
        : `OpsVale_Pricing_Matrix_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to generate Excel export:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
