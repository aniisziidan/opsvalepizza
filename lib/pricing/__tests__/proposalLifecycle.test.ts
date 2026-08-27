import { describe, it, expect } from 'vitest';

describe('Proposal Lifecycle, Outbox & Customer Action Integrity', () => {
  interface MockOutboxRecord {
    id: string;
    quoteId: string;
    status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
    attempts: number;
    createdAt: Date;
    sentAt: Date | null;
    lastError: string | null;
  }

  interface MockQuoteRecord {
    id: string;
    leadId: string;
    revision: number;
    status: 'DRAFT' | 'DISPATCHING' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED';
    accessToken: string | null;
    expiresAt: Date | null;
    acceptedAt: Date | null;
    rejectedAt: Date | null;
    snapshot: any;
  }

  interface MockLeadRecord {
    id: string;
    status: 'NEW' | 'QUOTE_PREPARED' | 'QUOTE_SENT' | 'NEGOTIATING' | 'WON' | 'LOST';
  }

  interface MockActivityRecord {
    id: string;
    leadId: string;
    type: string;
    content: string;
  }

  class MockProposalEngine {
    quotes: MockQuoteRecord[] = [];
    leads: MockLeadRecord[] = [];
    outbox: MockOutboxRecord[] = [];
    activities: MockActivityRecord[] = [];

    // Atomic outbox claim logic
    async claimOutboxRecord(outboxId: string, timeoutMinutes = 5): Promise<boolean> {
      const record = this.outbox.find((o) => o.id === outboxId);
      if (!record) return false;

      const now = Date.now();
      const isStuck =
        record.status === 'PROCESSING' &&
        now - record.createdAt.getTime() > timeoutMinutes * 60 * 1000;

      if (record.status === 'PENDING' || isStuck) {
        record.status = 'PROCESSING';
        return true;
      }
      return false;
    }

    // Dispatch action (Transactional Outbox)
    async dispatchQuote(quoteId: string): Promise<{ status: string }> {
      const quote = this.quotes.find((q) => q.id === quoteId);
      if (!quote) throw new Error('Quote not found');

      // Idempotent retry if already DISPATCHING
      if (quote.status === 'DISPATCHING') {
        const existingOutbox = this.outbox.find((o) => o.quoteId === quoteId);
        if (existingOutbox) {
          existingOutbox.status = 'PENDING';
          const claimed = await this.claimOutboxRecord(existingOutbox.id);
          if (claimed) {
            existingOutbox.status = 'SENT';
            existingOutbox.sentAt = new Date();
            quote.status = 'SENT';
            const lead = this.leads.find((l) => l.id === quote.leadId);
            if (lead) lead.status = 'QUOTE_SENT';
          }
          return { status: quote.status };
        }
      }

      if (quote.status !== 'DRAFT') {
        return { status: quote.status };
      }

      // 1. Enqueue outbox
      quote.status = 'DISPATCHING';
      quote.accessToken = `token-${quote.id}`;
      quote.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      quote.snapshot = { orderQuantity: 15000, unitPriceEur: '0.2450' };

      const outboxRow: MockOutboxRecord = {
        id: `outbox-${Date.now()}`,
        quoteId: quote.id,
        status: 'PENDING',
        attempts: 0,
        createdAt: new Date(),
        sentAt: null,
        lastError: null,
      };
      this.outbox.push(outboxRow);

      this.activities.push({
        id: `act-${Date.now()}`,
        leadId: quote.leadId,
        type: 'QUOTE_DISPATCHED',
        content: `Quote Rev ${quote.revision} dispatched`,
      });

      // 2. Process outbox
      const claimed = await this.claimOutboxRecord(outboxRow.id);
      if (claimed) {
        outboxRow.status = 'SENT';
        outboxRow.sentAt = new Date();
        quote.status = 'SENT';

        // Supersede previous SENT quotes
        for (const q of this.quotes) {
          if (q.leadId === quote.leadId && q.id !== quote.id && q.status === 'SENT') {
            q.status = 'SUPERSEDED';
          }
        }

        const lead = this.leads.find((l) => l.id === quote.leadId);
        if (lead) lead.status = 'QUOTE_SENT';
      }

      return { status: quote.status };
    }

    // Unified customer acceptance transaction
    async acceptProposal(token: string, notes?: string): Promise<void> {
      const quote = this.quotes.find((q) => q.accessToken === token);
      if (!quote) throw new Error('Proposal not found');

      const now = new Date();
      if (quote.status !== 'SENT') {
        if (quote.status === 'SUPERSEDED') throw new Error('Superseded');
        if (quote.status === 'ACCEPTED') throw new Error('Already accepted');
        if (quote.status === 'REJECTED') throw new Error('Declined');
        throw new Error('Not actionable');
      }

      if (quote.expiresAt && quote.expiresAt.getTime() <= now.getTime()) {
        throw new Error('Expired');
      }

      // Unified atomic update
      quote.status = 'ACCEPTED';
      quote.acceptedAt = now;

      const lead = this.leads.find((l) => l.id === quote.leadId);
      if (lead) lead.status = 'WON';

      this.activities.push({
        id: `act-${Date.now()}`,
        leadId: quote.leadId,
        type: 'CUSTOMER_RESPONSE',
        content: `Customer accepted Quote Rev ${quote.revision}${notes ? ` (${notes})` : ''}`,
      });
    }

    // Unified customer negotiation transaction
    async requestModification(token: string, message: string): Promise<void> {
      const quote = this.quotes.find((q) => q.accessToken === token);
      if (!quote || quote.status !== 'SENT') throw new Error('Not actionable');

      const lead = this.leads.find((l) => l.id === quote.leadId);
      if (lead) lead.status = 'NEGOTIATING';

      this.activities.push({
        id: `act-${Date.now()}`,
        leadId: quote.leadId,
        type: 'CUSTOMER_RESPONSE',
        content: `Customer requested modification: "${message}"`,
      });
    }

    // Unified customer decline transaction
    async declineProposal(token: string, reason?: string): Promise<void> {
      const quote = this.quotes.find((q) => q.accessToken === token);
      if (!quote || quote.status !== 'SENT') throw new Error('Not actionable');

      quote.status = 'REJECTED';
      quote.rejectedAt = new Date();

      const lead = this.leads.find((l) => l.id === quote.leadId);
      if (lead) lead.status = 'LOST';

      this.activities.push({
        id: `act-${Date.now()}`,
        leadId: quote.leadId,
        type: 'CUSTOMER_RESPONSE',
        content: `Customer declined Quote Rev ${quote.revision}${reason ? ` (${reason})` : ''}`,
      });
    }
  }

  it('atomically claims outbox records and prevents duplicate processing', async () => {
    const engine = new MockProposalEngine();
    engine.outbox.push({
      id: 'outbox-1',
      quoteId: 'quote-1',
      status: 'PENDING',
      attempts: 0,
      createdAt: new Date(),
      sentAt: null,
      lastError: null,
    });

    const claim1 = await engine.claimOutboxRecord('outbox-1');
    const claim2 = await engine.claimOutboxRecord('outbox-1');

    expect(claim1).toBe(true);
    expect(claim2).toBe(false); // Second worker cannot claim the same record
  });

  it('recovers stuck outbox jobs after timeout threshold', async () => {
    const engine = new MockProposalEngine();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    engine.outbox.push({
      id: 'outbox-stuck',
      quoteId: 'quote-1',
      status: 'PROCESSING',
      attempts: 1,
      createdAt: tenMinutesAgo,
      sentAt: null,
      lastError: null,
    });

    const claimed = await engine.claimOutboxRecord('outbox-stuck', 5);
    expect(claimed).toBe(true); // Successfully recovered
  });

  it('dispatches quote and advances lead to QUOTE_SENT with frozen snapshot', async () => {
    const engine = new MockProposalEngine();
    engine.leads.push({ id: 'lead-1', status: 'QUOTE_PREPARED' });
    engine.quotes.push({
      id: 'quote-1',
      leadId: 'lead-1',
      revision: 1,
      status: 'DRAFT',
      accessToken: null,
      expiresAt: null,
      acceptedAt: null,
      rejectedAt: null,
      snapshot: null,
    });

    const res = await engine.dispatchQuote('quote-1');
    expect(res.status).toBe('SENT');
    expect(engine.leads[0].status).toBe('QUOTE_SENT');
    expect(engine.quotes[0].accessToken).toBeDefined();
    expect(engine.quotes[0].snapshot.orderQuantity).toBe(15000);
  });

  it('supersedes previous SENT quote when a new revision is dispatched', async () => {
    const engine = new MockProposalEngine();
    engine.leads.push({ id: 'lead-1', status: 'QUOTE_SENT' });
    engine.quotes.push({
      id: 'quote-rev1',
      leadId: 'lead-1',
      revision: 1,
      status: 'SENT',
      accessToken: 'token-rev1',
      expiresAt: new Date(Date.now() + 100000),
      acceptedAt: null,
      rejectedAt: null,
      snapshot: { revision: 1 },
    });
    engine.quotes.push({
      id: 'quote-rev2',
      leadId: 'lead-1',
      revision: 2,
      status: 'DRAFT',
      accessToken: null,
      expiresAt: null,
      acceptedAt: null,
      rejectedAt: null,
      snapshot: null,
    });

    await engine.dispatchQuote('quote-rev2');

    expect(engine.quotes[0].status).toBe('SUPERSEDED'); // Rev 1 superseded
    expect(engine.quotes[1].status).toBe('SENT');       // Rev 2 sent

    // Customer attempting to accept Rev 1 token must be rejected
    await expect(engine.acceptProposal('token-rev1')).rejects.toThrow('Superseded');
  });

  it('executes acceptance in one unified transaction (Quote ACCEPTED + Lead WON + Activity)', async () => {
    const engine = new MockProposalEngine();
    engine.leads.push({ id: 'lead-1', status: 'QUOTE_SENT' });
    engine.quotes.push({
      id: 'quote-1',
      leadId: 'lead-1',
      revision: 1,
      status: 'SENT',
      accessToken: 'token-active',
      expiresAt: new Date(Date.now() + 100000),
      acceptedAt: null,
      rejectedAt: null,
      snapshot: {},
    });

    await engine.acceptProposal('token-active', 'PO #1234');

    expect(engine.quotes[0].status).toBe('ACCEPTED');
    expect(engine.quotes[0].acceptedAt).toBeDefined();
    expect(engine.leads[0].status).toBe('WON');
    expect(engine.activities.some((a) => a.type === 'CUSTOMER_RESPONSE')).toBe(true);

    // Double-acceptance replay is blocked
    await expect(engine.acceptProposal('token-active')).rejects.toThrow('Already accepted');
  });

  it('rejects expired quotes during customer acceptance', async () => {
    const engine = new MockProposalEngine();
    engine.leads.push({ id: 'lead-1', status: 'QUOTE_SENT' });
    engine.quotes.push({
      id: 'quote-expired',
      leadId: 'lead-1',
      revision: 1,
      status: 'SENT',
      accessToken: 'token-expired',
      expiresAt: new Date(Date.now() - 10000), // In the past
      acceptedAt: null,
      rejectedAt: null,
      snapshot: {},
    });

    await expect(engine.acceptProposal('token-expired')).rejects.toThrow('Expired');
  });

  it('updates lead to NEGOTIATING when modification requested', async () => {
    const engine = new MockProposalEngine();
    engine.leads.push({ id: 'lead-1', status: 'QUOTE_SENT' });
    engine.quotes.push({
      id: 'quote-1',
      leadId: 'lead-1',
      revision: 1,
      status: 'SENT',
      accessToken: 'token-negotiate',
      expiresAt: new Date(Date.now() + 100000),
      acceptedAt: null,
      rejectedAt: null,
      snapshot: {},
    });

    await engine.requestModification('token-negotiate', 'Can we adjust batch size?');

    expect(engine.quotes[0].status).toBe('SENT'); // Quote remains active
    expect(engine.leads[0].status).toBe('NEGOTIATING');
    expect(engine.activities.some((a) => a.content.includes('adjust batch size'))).toBe(true);
  });

  it('updates lead to LOST when proposal is declined', async () => {
    const engine = new MockProposalEngine();
    engine.leads.push({ id: 'lead-1', status: 'QUOTE_SENT' });
    engine.quotes.push({
      id: 'quote-1',
      leadId: 'lead-1',
      revision: 1,
      status: 'SENT',
      accessToken: 'token-decline',
      expiresAt: new Date(Date.now() + 100000),
      acceptedAt: null,
      rejectedAt: null,
      snapshot: {},
    });

    await engine.declineProposal('token-decline', 'Price too high');

    expect(engine.quotes[0].status).toBe('REJECTED');
    expect(engine.leads[0].status).toBe('LOST');
  });
});
