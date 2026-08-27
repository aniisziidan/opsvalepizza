'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { Prisma } from '@prisma/client';
import { buildQuoteProposalEmail } from '@/lib/email/sendQuoteProposal';
import { processOutboxEmail } from '@/lib/email/outbox';
import { formatBoxSpec } from '@/lib/admin/formatters';

const quoteInputSchema = z.object({
  unitPriceEur: z
    .union([z.number(), z.string()])
    .refine((v) => Number(v) > 0, 'Unit price must be greater than 0'),
  qty: z.number().int().min(1, 'Order quantity must be at least 1 box'),
  specs: z.string().max(1000, 'Specs cannot exceed 1000 characters').nullable().optional(),
  notes: z.string().max(2000, 'Internal notes cannot exceed 2000 characters').nullable().optional(),
  paymentTerms: z.string().max(500, 'Payment terms cannot exceed 500 characters').nullable().optional(),
  dispatchSla: z.string().max(500, 'Dispatch SLA cannot exceed 500 characters').nullable().optional(),
});

const MAX_RETRIES = 3;

/**
 * Concurrency-safe server action to prepare a new Quote revision for a lead.
 */
export async function createQuote(leadId: string, rawData: unknown) {
  const admin = await requireAdmin();

  if (!leadId || typeof leadId !== 'string') {
    throw new Error('Valid Lead ID is required');
  }

  const data = quoteInputSchema.parse(rawData);
  const priceDecimal = new Prisma.Decimal(Number(data.unitPriceEur).toFixed(4));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const lead = await tx.lead.findUnique({
          where: { id: leadId },
          select: { id: true, code: true, status: true },
        });

        if (!lead) {
          throw new Error(`Lead not found: ${leadId}`);
        }

        const latest = await tx.quote.findFirst({
          where: { leadId },
          orderBy: { revision: 'desc' },
          select: { revision: true },
        });

        const nextRevision = (latest?.revision ?? 0) + 1;

        const newQuote = await tx.quote.create({
          data: {
            leadId,
            revision: nextRevision,
            unitPriceEur: priceDecimal,
            qty: data.qty,
            specs: data.specs?.trim() || null,
            notes: data.notes?.trim() || null,
            paymentTerms: data.paymentTerms?.trim() || null,
            dispatchSla: data.dispatchSla?.trim() || null,
            status: 'DRAFT',
          },
        });

        // Supersede previous DRAFT quotes ONLY (leave SENT quotes intact as active proposals)
        await tx.quote.updateMany({
          where: {
            leadId,
            id: { not: newQuote.id },
            status: 'DRAFT',
          },
          data: { status: 'SUPERSEDED' },
        });

        // Advance lead status to QUOTE_PREPARED on Rev 1 if currently in intake stages
        if (nextRevision === 1) {
          if (['NEW', 'REVIEWING', 'NEED_MORE_INFO'].includes(lead.status)) {
            await tx.lead.update({
              where: { id: leadId },
              data: { status: 'QUOTE_PREPARED' },
            });
          }
        }

        // Log LeadActivity
        await tx.leadActivity.create({
          data: {
            leadId,
            authorId: admin.id,
            type: nextRevision === 1 ? 'QUOTE_CREATED' : 'QUOTE_REVISED',
            content:
              nextRevision === 1
                ? `Quote Rev 1 prepared: ${data.qty.toLocaleString()} pcs @ €${Number(data.unitPriceEur).toFixed(2)}/pc`
                : `Quote revised to Rev ${nextRevision}: ${data.qty.toLocaleString()} pcs @ €${Number(data.unitPriceEur).toFixed(2)}/pc (supersedes Rev ${nextRevision - 1} draft)`,
          },
        });

        return { quoteId: newQuote.id, revision: nextRevision };
      });

      revalidatePath('/admin');
      revalidatePath('/admin/leads');
      revalidatePath(`/admin/leads/${leadId}`);
      revalidatePath('/admin/quotes');
      revalidatePath('/admin/dashboard');

      return { success: true, ...result };
    } catch (err: any) {
      if (err?.code === 'P2002' && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Failed to generate quote revision after concurrent conflict retries');
}

/**
 * Idempotent server action to dispatch a formal Quote to the customer.
 * Uses transactional outbox, immutable snapshot freezing, and bearer token generation.
 */
export async function dispatchQuote(quoteId: string) {
  const admin = await requireAdmin();

  if (!quoteId || typeof quoteId !== 'string') {
    throw new Error('Valid Quote ID is required');
  }

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      lead: {
        include: {
          company: true,
          contact: true,
          quoteRequest: true,
          calcData: true,
        },
      },
      outboxEmails: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!quote) {
    throw new Error('Quote not found');
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const now = new Date();

  // Case A: Quote is already DISPATCHING (Retry existing failed outbox record)
  if (quote.status === 'DISPATCHING') {
    const existingOutbox = quote.outboxEmails[0];
    if (existingOutbox) {
      await prisma.outboxEmail.update({
        where: { id: existingOutbox.id },
        data: {
          status: 'PENDING',
          lastError: null,
        },
      });

      // Trigger outbox processor immediately
      const outboxResult = await processOutboxEmail(existingOutbox.id);

      revalidatePath('/admin');
      revalidatePath('/admin/leads');
      revalidatePath(`/admin/leads/${quote.leadId}`);
      revalidatePath('/admin/quotes');

      return {
        success: true,
        status: outboxResult.success ? 'SENT' : 'DISPATCHING',
        error: outboxResult.error,
      };
    }
  }

  // Case B: Quote is DRAFT -> First-time dispatch
  if (quote.status !== 'DRAFT') {
    return {
      success: true,
      status: quote.status,
      message: `Quote is already in ${quote.status} status.`,
    };
  }

  const lead = quote.lead;
  const qr = lead.quoteRequest;
  const calc = lead.calcData;

  const accessToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days validity
  const proposalUrl = `${appUrl}/proposals/${accessToken}`;
  const totalEur = (Number(quote.unitPriceEur) * quote.qty).toFixed(2);
  const boxSpecFormatted = formatBoxSpec(qr, calc);

  // Freeze immutable snapshot
  const snapshot = {
    companyName: lead.company.name,
    companyCountryCode: lead.company.countryCode,
    companyWebsite: lead.company.website,
    contactName: lead.contact.name,
    contactEmail: lead.contact.email,
    contactPhone: lead.contact.phone,
    contactJobTitle: lead.contact.jobTitle,
    boxSpec: boxSpecFormatted,
    boxSpecificationType: qr?.boxSpecificationType || 'STANDARD',
    standardBoxSize: qr?.standardBoxSize || calc?.boxSize || null,
    dimensionsMm: qr
      ? { length: qr.lengthMm, width: qr.widthMm, height: qr.heightMm }
      : null,
    material: qr?.material || calc?.material || 'KRAFT',
    print: qr?.print || calc?.print || 'PLAIN',
    customFlute: qr?.customFlute || null,
    monthlyVolume: qr?.monthlyVolume || calc?.monthlyVolume || 0,
    orderQuantity: quote.qty,
    unitPriceEur: quote.unitPriceEur.toString(),
    totalEur,
    currency: 'EUR',
    deliveryCity: qr?.deliveryCity || lead.company.countryCode || 'EU',
    deliveryCountryCode: qr?.deliveryCountryCode || lead.company.countryCode || 'EU',
    hasLoadingDock: qr?.hasLoadingDock || false,
    deliveryFrequency: qr?.deliveryFrequency || 'Monthly batch delivery',
    deliveryAccessNotes: qr?.deliveryAccessNotes || null,
    specsNotes: quote.specs || null,
    commercialNotes: quote.notes || null,
    paymentTerms:
      quote.paymentTerms ||
      'Standard 30 days net commercial invoicing upon approved company credit',
    dispatchSla:
      quote.dispatchSla ||
      '24-48 Hours guaranteed dispatch from Rotterdam Central Logistics Hub',
    revision: quote.revision,
    dispatchedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const emailContent = buildQuoteProposalEmail({
    leadCode: lead.code,
    revision: quote.revision,
    companyName: lead.company.name,
    contactName: lead.contact.name,
    contactEmail: lead.contact.email,
    boxSpec: boxSpecFormatted,
    qty: quote.qty,
    unitPriceEur: quote.unitPriceEur.toString(),
    totalEur,
    expiresAt: expiresAt.toISOString(),
    proposalUrl,
    specsNotes: quote.specs,
  });

  const { outboxId } = await prisma.$transaction(async (tx) => {
    // 1. Conditional atomic state transition: DRAFT -> DISPATCHING
    const updateCount = await tx.quote.updateMany({
      where: {
        id: quote.id,
        status: 'DRAFT',
      },
      data: {
        status: 'DISPATCHING',
        dispatchReqAt: now,
        accessToken,
        expiresAt,
        snapshot: snapshot as any,
      },
    });

    if (updateCount.count === 0) {
      throw new Error('Quote was already transitioned by another request');
    }

    // 2. Enqueue OutboxEmail
    const outbox = await tx.outboxEmail.create({
      data: {
        quoteId: quote.id,
        to: lead.contact.email,
        from: `"OpsVale Logistics" <${process.env.SMTP_USER || 'no-reply@opsvale.com'}>`,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
        status: 'PENDING',
      },
    });

    // 3. Create LeadActivity
    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        authorId: admin.id,
        type: 'QUOTE_DISPATCHED',
        content: `Quote Rev ${quote.revision} dispatch queued for ${lead.contact.email} (${quote.qty.toLocaleString()} pcs @ €${Number(quote.unitPriceEur).toFixed(2)}/pc • Total: €${Number(totalEur).toLocaleString('en-US', { minimumFractionDigits: 2 })})`,
      },
    });

    return { outboxId: outbox.id };
  });

  // Trigger outbox processor immediately
  const outboxResult = await processOutboxEmail(outboxId);

  revalidatePath('/admin');
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${lead.id}`);
  revalidatePath('/admin/quotes');
  revalidatePath('/admin/dashboard');

  return {
    success: true,
    status: outboxResult.success ? 'SENT' : 'DISPATCHING',
    error: outboxResult.error,
  };
}

/**
 * Authenticated helper to retrieve the full customer proposal URL for sharing/copying.
 */
export async function getProposalShareUrl(quoteId: string): Promise<{ url: string | null }> {
  await requireAdmin();

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    select: { accessToken: true },
  });

  if (!quote || !quote.accessToken) {
    return { url: null };
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  return { url: `${appUrl}/proposals/${quote.accessToken}` };
}
