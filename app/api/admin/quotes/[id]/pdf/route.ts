import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { generateProposalPdf } from '@/lib/pdf/generateProposalPdf';
import { CustomerProposalDTO } from '@/app/proposals/[token]/actions';
import { formatBoxSpec } from '@/lib/admin/formatters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
  }

  const { id } = await params;

  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Valid Quote ID is required' }, { status: 400 });
  }

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      lead: {
        include: {
          company: true,
          contact: true,
          quoteRequest: true,
          calcData: true,
        },
      },
    },
  });

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  }

  const now = new Date();
  const isExpired = Boolean(quote.expiresAt && quote.expiresAt.getTime() <= now.getTime());
  const snap = (quote.snapshot as any) || {};

  const lead = quote.lead;
  const qr = lead.quoteRequest;
  const calc = lead.calcData;

  const proposalDto: CustomerProposalDTO = {
    id: quote.id,
    leadCode: lead.code,
    revision: quote.revision,
    status: quote.status,
    isExpired,
    sentAt: quote.sentAt?.toISOString() || null,
    expiresAt: quote.expiresAt?.toISOString() || null,
    acceptedAt: quote.acceptedAt?.toISOString() || null,
    rejectedAt: quote.rejectedAt?.toISOString() || null,
    rejectionReason: quote.rejectionReason,
    companyName: snap.companyName || lead.company.name,
    contactName: snap.contactName || lead.contact.name,
    boxSpec: snap.boxSpec || formatBoxSpec(qr, calc),
    boxSpecificationType: snap.boxSpecificationType || qr?.boxSpecificationType || 'STANDARD',
    dimensionsMm: snap.dimensionsMm || (qr ? { length: qr.lengthMm, width: qr.widthMm, height: qr.heightMm } : null),
    material: snap.material || qr?.material || calc?.material || 'KRAFT',
    print: snap.print || qr?.print || calc?.print || 'PLAIN',
    customFlute: snap.customFlute || qr?.customFlute || null,
    monthlyVolume: snap.monthlyVolume || qr?.monthlyVolume || calc?.monthlyVolume || 0,
    orderQuantity: snap.orderQuantity || quote.qty,
    unitPriceEur: snap.unitPriceEur || quote.unitPriceEur.toString(),
    totalEur: snap.totalEur || (Number(quote.unitPriceEur) * quote.qty).toFixed(2),
    deliveryCity: snap.deliveryCity || qr?.deliveryCity || lead.company.countryCode || 'EU Hub',
    deliveryCountryCode: snap.deliveryCountryCode || qr?.deliveryCountryCode || lead.company.countryCode || 'EU',
    hasLoadingDock: snap.hasLoadingDock ?? qr?.hasLoadingDock ?? false,
    deliveryFrequency: snap.deliveryFrequency || qr?.deliveryFrequency || 'Monthly batch delivery',
    deliveryAccessNotes: snap.deliveryAccessNotes || qr?.deliveryAccessNotes || null,
    specsNotes: snap.specsNotes || quote.specs || null,
    commercialNotes: snap.commercialNotes || quote.notes || null,
    paymentTerms:
      snap.paymentTerms ||
      quote.paymentTerms ||
      'Standard 30 days net commercial invoicing upon approved company credit',
    dispatchSla:
      snap.dispatchSla ||
      quote.dispatchSla ||
      '24-48 Hours guaranteed dispatch from Rotterdam Central Logistics Hub',
  };

  try {
    const pdfBuffer = await generateProposalPdf(proposalDto);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="OpsVale_Quote_${lead.code}_R${quote.revision}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to render PDF' },
      { status: 500 }
    );
  }
}
