import { NextResponse } from 'next/server';
import { getProposalByToken } from '@/app/proposals/[token]/actions';
import { generateProposalPdf } from '@/lib/pdf/generateProposalPdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { token } = await params;

  if (!token || typeof token !== 'string' || token.length < 32) {
    return NextResponse.json({ error: 'Valid proposal access token is required' }, { status: 400 });
  }

  const proposal = await getProposalByToken(token);

  if (!proposal) {
    return NextResponse.json({ error: 'Commercial proposal not found' }, { status: 404 });
  }

  try {
    const pdfBuffer = await generateProposalPdf(proposal);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="OpsVale_Proposal_${proposal.leadCode}_R${proposal.revision}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate commercial proposal PDF' },
      { status: 500 }
    );
  }
}
