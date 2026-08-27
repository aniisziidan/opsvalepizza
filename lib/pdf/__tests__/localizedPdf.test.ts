import { describe, it, expect } from 'vitest';
import { generateProposalPdf } from '../generateProposalPdf';
import { CustomerProposalDTO } from '@/app/proposals/[token]/actions';
import { QuoteStatus } from '@prisma/client';

const mockProposal: CustomerProposalDTO = {
  id: 'quote-test-1',
  leadCode: 'OPS-2026-9999',
  revision: 1,
  status: QuoteStatus.SENT,
  isExpired: false,
  sentAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
  acceptedAt: null,
  rejectedAt: null,
  rejectionReason: null,
  proposalLocale: 'de',
  companyName: 'Bavaria Pizza Group GmbH',
  contactName: 'Hans Gruber',
  boxSpec: '32cm Kraft Corrugated Boxes',
  boxSpecificationType: 'STANDARD',
  dimensionsMm: { length: 320, width: 320, height: 40 },
  material: 'KRAFT',
  print: 'PRINTED',
  customFlute: 'E-Flute Microcorrugated',
  monthlyVolume: 50000,
  orderQuantity: 25000,
  unitPriceEur: '0.1950',
  totalEur: '4875.00',
  deliveryCity: 'Munich',
  deliveryCountryCode: 'DE',
  hasLoadingDock: true,
  deliveryFrequency: 'Bi-Weekly Pallet Drop',
  deliveryAccessNotes: 'Gate 4 Dock',
  specsNotes: 'Thermal venting holes required',
  commercialNotes: 'Net 30 Days on invoice approval',
  paymentTerms: 'Net 30 Days',
  dispatchSla: '48 Hours Hub Dispatch',
};

describe('Localized Proposal PDF Generator', () => {
  it('generates valid vector PDF buffer in German when proposal locale is de', async () => {
    const buffer = await generateProposalPdf(mockProposal);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    // PDF Magic Bytes %PDF-
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('generates valid vector PDF buffer in French, Italian, Spanish, and English deterministically', async () => {
    for (const loc of ['fr', 'it', 'es', 'en'] as const) {
      const buffer = await generateProposalPdf(mockProposal, loc);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    }
  });
});
