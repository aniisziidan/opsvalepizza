import { describe, it, expect } from 'vitest';
import { calculateAnalyticsSummary } from '../analyticsQueries';
import { LeadStatus, QuoteStatus } from '@prisma/client';

describe('Analytics & Telemetry Aggregation Engine', () => {
  it('correctly aggregates funnel conversion stages and ACV from lead records', () => {
    const mockLeads: any[] = [
      {
        id: 'lead-1',
        status: LeadStatus.WON,
        createdAt: new Date('2026-08-01T10:00:00Z'),
        deliveryCountryCode: 'DE',
        boxSize: '32cm',
        material: 'KRAFT',
        print: 'PRINTED',
        source: 'Savings Calculator',
        quotes: [
          {
            id: 'q-1',
            status: QuoteStatus.ACCEPTED,
            qty: 50000,
            unitPriceEur: 0.19,
            createdAt: new Date('2026-08-01T12:00:00Z'),
            sentAt: new Date('2026-08-01T14:00:00Z'),
            acceptedAt: new Date('2026-08-02T14:00:00Z'),
          },
        ],
      },
      {
        id: 'lead-2',
        status: LeadStatus.QUOTE_SENT,
        createdAt: new Date('2026-08-02T10:00:00Z'),
        deliveryCountryCode: 'FR',
        boxSize: '33cm',
        material: 'WHITE',
        print: 'PRINTED',
        source: 'Direct Quote Form',
        quotes: [
          {
            id: 'q-2',
            status: QuoteStatus.SENT,
            qty: 25000,
            unitPriceEur: 0.22,
            createdAt: new Date('2026-08-02T11:00:00Z'),
            sentAt: new Date('2026-08-02T15:00:00Z'),
            acceptedAt: null,
          },
        ],
      },
      {
        id: 'lead-3',
        status: LeadStatus.NEW,
        createdAt: new Date('2026-08-03T09:00:00Z'),
        deliveryCountryCode: 'DE',
        boxSize: '32cm',
        material: 'KRAFT',
        print: 'PLAIN',
        source: 'Savings Calculator',
        quotes: [],
      },
    ];

    const result = calculateAnalyticsSummary(mockLeads);

    expect(result.summary.totalLeads).toBe(3);
    expect(result.summary.wonLeadsCount).toBe(1);
    expect(result.summary.realizedWonRevenueEur).toBe(9500); // 50000 * 0.19
    expect(result.summary.totalContractedBoxes).toBe(50000);
    expect(result.summary.averageContractValueEur).toBe(9500);

    // Funnel test
    expect(result.funnel[0].count).toBe(3); // Inquiries
    expect(result.funnel[1].count).toBe(2); // Qualified+ (QUOTE_SENT + WON)
    expect(result.funnel[2].count).toBe(2); // Proposals Sent+ (QUOTE_SENT + WON)
    expect(result.funnel[4].count).toBe(1); // Won

    // Territory test
    const deTerritory = result.territories.find((t) => t.countryCode === 'DE');
    expect(deTerritory).toBeDefined();
    expect(deTerritory?.leadCount).toBe(2);
    expect(deTerritory?.wonCount).toBe(1);
    expect(deTerritory?.totalRevenueEur).toBe(9500);

    // Sources test
    const calcSource = result.sources.find((s) => s.source === 'Savings Calculator');
    expect(calcSource?.count).toBe(2);
    expect(calcSource?.wonCount).toBe(1);
  });
});
