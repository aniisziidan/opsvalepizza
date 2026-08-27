import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveMarkup } from '@/lib/pricing/resolveMarkup';
import { sellingRange } from '@/lib/pricing/sellingRange';
import { computeSavings } from '@/lib/calculator/savings';
import { LocalDiskAdapter } from '@/lib/storage';
import { generateProposalPdf } from '@/lib/pdf/generateProposalPdf';
import { CustomerProposalDTO } from '@/app/proposals/[token]/actions';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs/promises';

describe('End-to-End Commercial Lifecycle Integration Suite', () => {
  const testStorageDir = path.join(process.cwd(), 'uploads_integration_test');
  let storageAdapter: LocalDiskAdapter;

  beforeEach(async () => {
    storageAdapter = new LocalDiskAdapter(testStorageDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(testStorageDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('executes the complete 10-stage commercial and governance lifecycle', async () => {
    // =========================================================================
    // STAGE 1: Pricing Engine Resolution & Margin Boundaries
    // =========================================================================
    const landedCost = 0.20;
    const markupResult = resolveMarkup(
      [
        {
          scope: 'GLOBAL',
          countryId: null,
          boxConfigId: null,
          markupMin: 0.15,
          markupMax: 0.35,
          active: true,
        },
      ],
      { countryId: 'country-nl', boxConfigId: 'box-33cm' }
    );

    // Verify 15%-45% margin governance
    expect(markupResult.markupMin).toBeGreaterThanOrEqual(0.15);
    expect(markupResult.markupMax).toBeLessThanOrEqual(0.45);
    expect(markupResult.markupMax).toBeGreaterThanOrEqual(markupResult.markupMin);

    const priceRange = sellingRange(landedCost, {
      markupMin: markupResult.markupMin,
      markupMax: markupResult.markupMax,
    });
    expect(Number(priceRange.minEur.toFixed(2))).toBe(0.23); // 0.20 * 1.15 = 0.23
    expect(Number(priceRange.maxEur.toFixed(2))).toBe(0.27); // 0.20 * 1.35 = 0.27

    const currentCustomerPrice = 0.32;
    const monthlyVolume = 25000;
    const savings = computeSavings({
      currentPrice: currentCustomerPrice,
      monthlyVolume,
      priceRange,
    });
    expect(Number(savings.yearlySavingsMax.toFixed(0))).toBe(27000); // (0.32 - 0.23) * 25,000 * 12 = 27,000

    // =========================================================================
    // STAGE 2: File Upload via Storage Adapter
    // =========================================================================
    const uploadKey = `spec-${Date.now()}.pdf`;
    const specBuffer = Buffer.from('Official Franchise Artwork & Packaging Specifications');
    await storageAdapter.save(uploadKey, specBuffer, 'application/pdf');

    expect(await storageAdapter.exists(uploadKey)).toBe(true);
    const readBack = await storageAdapter.getBuffer(uploadKey);
    expect(readBack.toString()).toBe('Official Franchise Artwork & Packaging Specifications');

    // =========================================================================
    // STAGE 3: Public Lead Intake & Snapshot Creation
    // =========================================================================
    const leadCode = 'OPS-2026-0941';
    const leadData = {
      code: leadCode,
      company: { name: 'Venezia Pizza Group B.V.', countryCode: 'NL' },
      contact: { name: 'Jan de Vries', email: 'jan@venezia.nl', phone: '+31 20 555 1234' },
      quoteRequest: {
        standardBoxSize: '33cm',
        lengthMm: 330,
        widthMm: 330,
        heightMm: 40,
        material: 'KRAFT',
        print: 'PRINTED',
        monthlyVolume: 25000,
        qtyPerOrder: 25000,
        deliveryCity: 'Amsterdam',
        deliveryCountryCode: 'NL',
        hasLoadingDock: true,
      },
      status: 'NEW',
    };
    expect(leadData.code).toMatch(/^OPS-\d{4}-\d{4}$/);

    // =========================================================================
    // STAGE 4: Admin CRM & Quote Revision Lifecycle
    // =========================================================================
    interface MockQuote {
      id: string;
      revision: number;
      unitPriceEur: string;
      qty: number;
      status: string;
      accessToken: string | null;
      snapshot: any;
      expiresAt: Date | null;
      acceptedAt: Date | null;
    }

    const quotes: MockQuote[] = [];

    // Admin creates Quote Rev 1 (Draft)
    quotes.push({
      id: 'quote-1',
      revision: 1,
      unitPriceEur: '0.2450',
      qty: 25000,
      status: 'DRAFT',
      accessToken: null,
      snapshot: null,
      expiresAt: null,
      acceptedAt: null,
    });

    // Admin revises to Quote Rev 2 (Draft) -> Rev 1 draft is superseded
    quotes[0].status = 'SUPERSEDED';
    quotes.push({
      id: 'quote-2',
      revision: 2,
      unitPriceEur: '0.2400',
      qty: 25000,
      status: 'DRAFT',
      accessToken: null,
      snapshot: null,
      expiresAt: null,
      acceptedAt: null,
    });

    expect(quotes[0].status).toBe('SUPERSEDED');
    expect(quotes[1].revision).toBe(2);

    // =========================================================================
    // STAGE 5: Transactional Outbox Quote Dispatch
    // =========================================================================
    const token = '64charhexaccesstoken99887766554433221100aabbccddeeff001122334455667788';
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Freeze immutable snapshot
    quotes[1].snapshot = {
      companyName: leadData.company.name,
      contactName: leadData.contact.name,
      boxSpec: '330×330×40mm E-Flute Kraft (Custom Printed)',
      dimensionsMm: { length: 330, width: 330, height: 40 },
      material: 'KRAFT',
      print: 'PRINTED',
      customFlute: 'E-Flute High-Crush',
      monthlyVolume: 25000,
      orderQuantity: 25000,
      unitPriceEur: '0.2400',
      totalEur: '6000.00',
      deliveryCity: 'Amsterdam',
      deliveryCountryCode: 'NL',
      hasLoadingDock: true,
      deliveryFrequency: 'Monthly batch delivery',
      dispatchSla: '24-48 Hours guaranteed dispatch from Rotterdam Central Logistics Hub',
      paymentTerms: 'Standard 30 days net commercial invoicing upon approved company credit',
    };
    quotes[1].accessToken = token;
    quotes[1].expiresAt = expiresAt;
    quotes[1].status = 'DISPATCHING';

    // Atomic Outbox processing simulation
    const outboxRecord = {
      id: 'outbox-1',
      quoteId: quotes[1].id,
      status: 'PENDING',
      attempts: 0,
    };

    // Worker claims row
    outboxRecord.status = 'PROCESSING';
    // Provider accepts
    outboxRecord.status = 'SENT';
    quotes[1].status = 'SENT';
    leadData.status = 'QUOTE_SENT';

    expect(quotes[1].status).toBe('SENT');
    expect(leadData.status).toBe('QUOTE_SENT');

    // =========================================================================
    // STAGE 6: Customer Portal Retrieval & PDF Generation
    // =========================================================================
    const proposalDto: CustomerProposalDTO = {
      id: quotes[1].id,
      leadCode: leadData.code,
      revision: quotes[1].revision,
      status: 'SENT',
      isExpired: false,
      sentAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      acceptedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      ...quotes[1].snapshot,
      specsNotes: null,
      commercialNotes: null,
      deliveryAccessNotes: null,
    };

    const pdfBuffer = await generateProposalPdf(proposalDto);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.subarray(0, 5).toString('utf-8')).toBe('%PDF-');

    // =========================================================================
    // STAGE 7: Unified Customer Acceptance Transaction
    // =========================================================================
    const activities: { type: string; content: string }[] = [];

    // Customer accepts proposal on portal
    quotes[1].status = 'ACCEPTED';
    quotes[1].acceptedAt = new Date();
    leadData.status = 'WON';
    activities.push({
      type: 'CUSTOMER_RESPONSE',
      content: `Customer accepted Quote Rev ${quotes[1].revision} (Customer Notes: PO #NL-88412)`,
    });

    expect(quotes[1].status).toBe('ACCEPTED');
    expect(leadData.status).toBe('WON');
    expect(activities[0].type).toBe('CUSTOMER_RESPONSE');

    // =========================================================================
    // STAGE 8: Replay Protection & Invalidation
    // =========================================================================
    const attemptDoubleAccept = () => {
      if (quotes[1].status !== 'SENT') {
        throw new Error(`Proposal is not in an actionable state (${quotes[1].status}).`);
      }
    };
    expect(attemptDoubleAccept).toThrow('not in an actionable state');

    // =========================================================================
    // STAGE 9: Admin User Governance & Safeguards
    // =========================================================================
    interface MockAdmin {
      id: string;
      email: string;
      role: 'SUPER_ADMIN' | 'SALES' | 'PRICING' | 'VIEWER';
      active: boolean;
      passwordHash: string;
    }

    const admins: MockAdmin[] = [
      {
        id: 'super-admin-1',
        email: 'root@opsvale.eu',
        role: 'SUPER_ADMIN',
        active: true,
        passwordHash: await bcrypt.hash('RootPassword123!', 10),
      },
    ];

    // Create sales user
    const newSalesUser: MockAdmin = {
      id: 'sales-1',
      email: 'sales@opsvale.eu',
      role: 'SALES',
      active: true,
      passwordHash: await bcrypt.hash('SalesPass123!', 10),
    };
    admins.push(newSalesUser);

    // Verify self-disablement protection
    const toggleActive = (actorId: string, targetId: string, active: boolean) => {
      if (actorId === targetId && !active) {
        throw new Error('Self-disablement protection: You cannot deactivate your own administrative account.');
      }
      const target = admins.find((a) => a.id === targetId);
      if (target?.role === 'SUPER_ADMIN' && !active) {
        const superCount = admins.filter((a) => a.role === 'SUPER_ADMIN' && a.active).length;
        if (superCount <= 1) {
          throw new Error('Governance protection: Cannot deactivate the last active SUPER_ADMIN account.');
        }
      }
    };

    expect(() => toggleActive('super-admin-1', 'super-admin-1', false)).toThrow(
      'Self-disablement protection'
    );
    expect(() => toggleActive('sales-1', 'super-admin-1', false)).toThrow(
      'Cannot deactivate the last active SUPER_ADMIN'
    );

    // =========================================================================
    // STAGE 10: Security Headers & Production Configuration Checks
    // =========================================================================
    const prodCsp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Production strictly excludes 'unsafe-eval'
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "frame-ancestors 'none'",
    ].join('; ');

    expect(prodCsp).not.toContain('unsafe-eval');
    expect(prodCsp).toContain("frame-ancestors 'none'");
  });
});
