import { describe, it, expect } from 'vitest';

describe('Quote Revision Lifecycle & Concurrency', () => {
  interface MockQuote {
    id: string;
    leadId: string;
    revision: number;
    status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'SUPERSEDED';
    unitPriceEur: number;
    qty: number;
  }

  // Pure logic engine replicating the transaction + retry behavior of createQuote
  class QuoteRevisionManager {
    private quotes: MockQuote[] = [];

    async createQuoteConcurrent(
      leadId: string,
      data: { unitPriceEur: number; qty: number }
    ): Promise<MockQuote> {
      const MAX_RETRIES = 25;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        // 1. Simulate reading highest revision
        const leadQuotes = this.quotes.filter((q) => q.leadId === leadId);
        const maxRev = leadQuotes.reduce((max, q) => Math.max(max, q.revision), 0);
        const nextRev = maxRev + 1;

        // Introduce random async jitter to test race conditions
        await new Promise((res) => setTimeout(res, Math.random() * 5));

        // 2. Simulate DB unique constraint on [leadId, revision]
        const alreadyExists = this.quotes.some(
          (q) => q.leadId === leadId && q.revision === nextRev
        );

        if (alreadyExists) {
          // Unique constraint conflict (P2002) -> exponential backoff with jitter
          await new Promise((res) => setTimeout(res, Math.random() * 10 + attempt * 2));
          continue;
        }

        // 3. Supersede previous DRAFT quotes only (leave SENT intact)
        for (const q of this.quotes) {
          if (q.leadId === leadId && q.status === 'DRAFT') {
            q.status = 'SUPERSEDED';
          }
        }

        // 4. Create new DRAFT quote
        const newQuote: MockQuote = {
          id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          leadId,
          revision: nextRev,
          status: 'DRAFT',
          unitPriceEur: data.unitPriceEur,
          qty: data.qty,
        };

        this.quotes.push(newQuote);
        return newQuote;
      }

      throw new Error('Revision conflict limit exceeded');
    }

    getQuotes(leadId: string): MockQuote[] {
      return this.quotes
        .filter((q) => q.leadId === leadId)
        .sort((a, b) => b.revision - a.revision);
    }
  }

  it('allocates sequential revision numbers monotonically', async () => {
    const manager = new QuoteRevisionManager();
    const q1 = await manager.createQuoteConcurrent('lead-1', { unitPriceEur: 0.25, qty: 10000 });
    const q2 = await manager.createQuoteConcurrent('lead-1', { unitPriceEur: 0.24, qty: 15000 });
    const q3 = await manager.createQuoteConcurrent('lead-1', { unitPriceEur: 0.23, qty: 20000 });

    expect(q1.revision).toBe(1);
    expect(q2.revision).toBe(2);
    expect(q3.revision).toBe(3);
  });

  it('supersedes previous DRAFT quotes when creating a new revision', async () => {
    const manager = new QuoteRevisionManager();
    await manager.createQuoteConcurrent('lead-1', { unitPriceEur: 0.25, qty: 10000 });
    await manager.createQuoteConcurrent('lead-1', { unitPriceEur: 0.24, qty: 15000 });

    const quotes = manager.getQuotes('lead-1');
    expect(quotes).toHaveLength(2);
    expect(quotes[0].revision).toBe(2);
    expect(quotes[0].status).toBe('DRAFT');
    expect(quotes[1].revision).toBe(1);
    expect(quotes[1].status).toBe('SUPERSEDED');
  });

  it('preserves SENT quotes when preparing a new DRAFT revision', async () => {
    const manager = new QuoteRevisionManager();
    const q1 = await manager.createQuoteConcurrent('lead-1', { unitPriceEur: 0.25, qty: 10000 });

    // Customer received Rev 1 (SENT)
    q1.status = 'SENT';

    // Admin prepares Rev 2
    const q2 = await manager.createQuoteConcurrent('lead-1', { unitPriceEur: 0.24, qty: 15000 });

    const quotes = manager.getQuotes('lead-1');
    expect(quotes).toHaveLength(2);
    expect(q2.status).toBe('DRAFT');
    expect(q1.status).toBe('SENT'); // Must remain SENT!
  });

  it('safely handles 10 simultaneous concurrent quote creation requests without duplicates', async () => {
    const manager = new QuoteRevisionManager();
    const leadId = 'lead-concurrent-test';

    // Launch 10 simultaneous requests
    const promises = Array.from({ length: 10 }).map((_, idx) =>
      manager.createQuoteConcurrent(leadId, {
        unitPriceEur: 0.20 + idx * 0.01,
        qty: 10000 + idx * 1000,
      })
    );

    const results = await Promise.all(promises);
    const revisions = results.map((r) => r.revision).sort((a, b) => a - b);

    // Verify all revisions from 1 to 10 are allocated uniquely with zero collisions
    expect(revisions).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    // Exactly one quote should be DRAFT and 9 should be SUPERSEDED
    const allLeadQuotes = manager.getQuotes(leadId);
    expect(allLeadQuotes).toHaveLength(10);
    const draftQuotes = allLeadQuotes.filter((q) => q.status === 'DRAFT');
    const supersededQuotes = allLeadQuotes.filter((q) => q.status === 'SUPERSEDED');
    expect(draftQuotes).toHaveLength(1);
    expect(supersededQuotes).toHaveLength(9);
    expect(draftQuotes[0].revision).toBe(10);
  });
});
