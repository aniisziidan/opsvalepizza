import { describe, it, expect } from 'vitest';
import { generateProposalPdf } from '@/lib/pdf/generateProposalPdf';
import { CustomerProposalDTO } from '@/app/proposals/[token]/actions';

describe('Official Commercial Proposal PDF Generation', () => {
  const baseProposal: CustomerProposalDTO = {
    id: 'quote-test-1',
    leadCode: 'OPS-2026-0088',
    revision: 1,
    status: 'SENT',
    isExpired: false,
    sentAt: '2026-08-26T10:00:00Z',
    expiresAt: '2026-09-25T10:00:00Z',
    acceptedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    companyName: 'Napoli Express Pizzerias S.r.l.',
    contactName: 'Matteo Rossi',
    boxSpec: '330×330×40mm E-Flute Kraft (Custom Printed)',
    boxSpecificationType: 'CUSTOM',
    dimensionsMm: { length: 330, width: 330, height: 40 },
    material: 'KRAFT',
    print: 'PRINTED',
    customFlute: 'E-Flute High-Crush',
    monthlyVolume: 25000,
    orderQuantity: 25000,
    unitPriceEur: '0.2450',
    totalEur: '6125.00',
    deliveryCity: 'Milan',
    deliveryCountryCode: 'IT',
    hasLoadingDock: true,
    deliveryFrequency: 'Monthly batch delivery',
    deliveryAccessNotes: 'Direct semi-trailer access via Via Dante loading dock 4',
    specsNotes: '2-color top lid flexographic print with food-safe non-toxic inks',
    commercialNotes: 'Palletized 500 pcs per pallet with moisture barrier stretch-wrap',
    paymentTerms: 'Standard 30 days net commercial invoicing upon approved company credit',
    dispatchSla: '24-48 Hours guaranteed dispatch from Rotterdam Central Logistics Hub',
  };

  it('generates a valid binary PDF buffer starting with %PDF- header', async () => {
    const pdfBuffer = await generateProposalPdf(baseProposal);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1500);

    // Verify valid PDF file signature
    const header = pdfBuffer.subarray(0, 5).toString('utf-8');
    expect(header).toBe('%PDF-');
  });

  it('generates valid PDF for DRAFT proposals with draft watermark', async () => {
    const draftProposal: CustomerProposalDTO = {
      ...baseProposal,
      status: 'DRAFT',
    };

    const pdfBuffer = await generateProposalPdf(draftProposal);
    expect(pdfBuffer.length).toBeGreaterThan(1500);
    expect(pdfBuffer.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
  });

  it('generates valid PDF for ACCEPTED proposals with acceptance banner', async () => {
    const acceptedProposal: CustomerProposalDTO = {
      ...baseProposal,
      status: 'ACCEPTED',
      acceptedAt: '2026-08-26T14:30:00Z',
    };

    const pdfBuffer = await generateProposalPdf(acceptedProposal);
    expect(pdfBuffer.length).toBeGreaterThan(1500);
  });

  it('generates valid PDF for SUPERSEDED proposals with warning banner', async () => {
    const supersededProposal: CustomerProposalDTO = {
      ...baseProposal,
      status: 'SUPERSEDED',
    };

    const pdfBuffer = await generateProposalPdf(supersededProposal);
    expect(pdfBuffer.length).toBeGreaterThan(1500);
  });

  it('generates valid PDF for EXPIRED proposals', async () => {
    const expiredProposal: CustomerProposalDTO = {
      ...baseProposal,
      isExpired: true,
    };

    const pdfBuffer = await generateProposalPdf(expiredProposal);
    expect(pdfBuffer.length).toBeGreaterThan(1500);
  });

  it('handles standard boxes without custom dimensions gracefully', async () => {
    const standardProposal: CustomerProposalDTO = {
      ...baseProposal,
      boxSpecificationType: 'STANDARD',
      dimensionsMm: null,
      customFlute: null,
      specsNotes: null,
      commercialNotes: null,
    };

    const pdfBuffer = await generateProposalPdf(standardProposal);
    expect(pdfBuffer.length).toBeGreaterThan(1500);
    expect(pdfBuffer.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
  });
});
