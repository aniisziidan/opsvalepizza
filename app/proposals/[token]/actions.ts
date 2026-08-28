'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { QuoteStatus } from '@prisma/client';
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@/lib/legal/config';
import { emitNotificationEvent } from '@/lib/notifications/dispatcher';

export interface CustomerProposalDTO {
  id: string;
  leadCode: string;
  revision: number;
  status: QuoteStatus;
  isExpired: boolean;
  sentAt: string | null;
  expiresAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  proposalLocale?: string;
  // Frozen snapshot details
  companyName: string;
  contactName: string;
  boxSpec: string;
  boxSpecificationType: string;
  dimensionsMm: { length: number; width: number; height: number } | null;
  material: string;
  print: string;
  customFlute: string | null;
  monthlyVolume: number;
  orderQuantity: number;
  unitPriceEur: string;
  totalEur: string;
  deliveryCity: string;
  deliveryCountryCode: string;
  hasLoadingDock: boolean;
  deliveryFrequency: string;
  deliveryAccessNotes: string | null;
  specsNotes: string | null;
  commercialNotes: string | null;
  paymentTerms: string;
  dispatchSla: string;
}

const acceptSchema = z.object({
  customerNotes: z.string().max(500, 'Notes cannot exceed 500 characters').nullable().optional(),
  acceptedLocale: z.string().optional().default('en'),
});

const modificationSchema = z.object({
  message: z
    .string()
    .min(10, 'Please provide at least 10 characters describing the requested adjustments')
    .max(2000, 'Message cannot exceed 2000 characters')
    .trim(),
});

const declineSchema = z.object({
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').nullable().optional(),
});

/**
 * Fetch a customer proposal by its secure 64-char bearer access token.
 */
export async function getProposalByToken(token: string): Promise<CustomerProposalDTO | null> {
  if (!token || typeof token !== 'string' || token.length < 32) {
    return null;
  }

  const quote = await prisma.quote.findUnique({
    where: { accessToken: token },
    include: {
      lead: {
        select: {
          code: true,
        },
      },
    },
  });

  if (!quote) {
    return null;
  }

  const now = new Date();
  const isExpired = Boolean(quote.expiresAt && quote.expiresAt.getTime() <= now.getTime());
  const snap = (quote.snapshot as any) || {};

  return {
    id: quote.id,
    leadCode: quote.lead.code,
    revision: quote.revision,
    status: quote.status,
    isExpired,
    sentAt: quote.sentAt?.toISOString() || null,
    expiresAt: quote.expiresAt?.toISOString() || null,
    acceptedAt: quote.acceptedAt?.toISOString() || null,
    rejectedAt: quote.rejectedAt?.toISOString() || null,
    rejectionReason: quote.rejectionReason,
    proposalLocale: snap.proposalLocale || 'en',
    companyName: snap.companyName || 'Valued Franchisee',
    contactName: snap.contactName || 'Procurement Team',
    boxSpec: snap.boxSpec || `${quote.qty.toLocaleString()} Custom Pizza Boxes`,
    boxSpecificationType: snap.boxSpecificationType || 'STANDARD',
    dimensionsMm: snap.dimensionsMm || null,
    material: snap.material || 'KRAFT',
    print: snap.print || 'PRINTED',
    customFlute: snap.customFlute || null,
    monthlyVolume: snap.monthlyVolume || 20000,
    orderQuantity: quote.qty,
    unitPriceEur: quote.unitPriceEur.toString(),
    totalEur: (Number(quote.unitPriceEur) * quote.qty).toFixed(2),
    deliveryCity: snap.deliveryCity || 'Central Hub',
    deliveryCountryCode: snap.deliveryCountryCode || 'EU',
    hasLoadingDock: snap.hasLoadingDock ?? true,
    deliveryFrequency: snap.deliveryFrequency || 'Scheduled Contract Run',
    deliveryAccessNotes: snap.deliveryAccessNotes || null,
    specsNotes: snap.specsNotes || null,
    commercialNotes: snap.commercialNotes || null,
    paymentTerms: snap.paymentTerms || 'Net 30 Days',
    dispatchSla: snap.dispatchSla || 'Standard 48-Hour Corridor SLA',
  };
}

/**
 * Customer accepts proposal. Transitions Quote to ACCEPTED and Lead to WON,
 * recording immutable legal version acceptance (Terms & Privacy versions).
 */
export async function acceptProposal(token: string, rawInput: unknown = {}) {
  if (!token || typeof token !== 'string') {
    throw new Error('Valid proposal token is required');
  }

  const data = acceptSchema.parse(rawInput);
  const now = new Date();

  const acceptRes = await prisma.$transaction(async (tx) => {
    // 1. Atomic update of Quote status
    const updateRes = await tx.quote.updateMany({
      where: {
        accessToken: token,
        status: 'SENT',
        expiresAt: { gt: now },
      },
      data: {
        status: 'ACCEPTED',
        acceptedAt: now,
      },
    });

    if (updateRes.count === 0) {
      const q = await tx.quote.findUnique({ where: { accessToken: token } });
      if (!q) throw new Error('Proposal not found');
      if (q.status === 'ACCEPTED') throw new Error('This proposal has already been accepted.');
      if (q.status === 'SUPERSEDED') throw new Error('This proposal has been superseded by a newer revision.');
      if (q.status === 'REJECTED') throw new Error('This proposal was previously declined.');
      if (q.expiresAt && q.expiresAt.getTime() <= now.getTime()) {
        throw new Error('This proposal has expired. Please contact OpsVale for an updated quotation.');
      }
      throw new Error(`Proposal is not in an actionable state (${q.status}).`);
    }

    // 2. Advance Lead status to WON
    const quote = await tx.quote.findUniqueOrThrow({
      where: { accessToken: token },
      include: {
        lead: {
          include: { company: true, contact: true },
        },
      },
    });

    await tx.lead.update({
      where: { id: quote.leadId },
      data: { status: 'WON' },
    });

    // 3. Log structured customer response activity with legal audit trail
    await tx.leadActivity.create({
      data: {
        leadId: quote.leadId,
        type: 'CUSTOMER_RESPONSE',
        content: `Customer accepted Quote Rev ${quote.revision} under Terms v${CURRENT_TERMS_VERSION}, Privacy v${CURRENT_PRIVACY_VERSION} (${data.acceptedLocale || 'en'})${
          data.customerNotes ? ` (Customer Notes: ${data.customerNotes})` : ''
        }`,
      },
    });

    return { quote };
  });

  // Emit event to centralized notification system
  emitNotificationEvent({
    type: 'PROPOSAL_ACCEPTED',
    category: 'PROPOSAL',
    priority: 'HIGH',
    title: `Proposal Accepted: ${acceptRes.quote.lead.company.name}`,
    message: `${acceptRes.quote.lead.contact.name} accepted Quote Rev ${acceptRes.quote.revision} (€${(Number(acceptRes.quote.unitPriceEur) * acceptRes.quote.qty).toLocaleString('en-US', { minimumFractionDigits: 2 })}).`,
    entityType: 'QUOTE',
    entityId: acceptRes.quote.id,
    actionUrl: `/admin/leads/${acceptRes.quote.leadId}`,
    metadata: {
      leadId: acceptRes.quote.leadId,
      leadCode: acceptRes.quote.lead.code,
      companyName: acceptRes.quote.lead.company.name,
      contactName: acceptRes.quote.lead.contact.name,
      revision: acceptRes.quote.revision,
      orderQuantity: acceptRes.quote.qty,
      unitPriceEur: acceptRes.quote.unitPriceEur.toString(),
      totalEur: (Number(acceptRes.quote.unitPriceEur) * acceptRes.quote.qty).toFixed(2),
      customerNotes: data.customerNotes,
    },
  }).catch((err) => console.error('Failed to emit PROPOSAL_ACCEPTED event:', err));

  revalidatePath(`/proposals/${token}`);
  revalidatePath('/admin');
  revalidatePath('/admin/leads');
  revalidatePath('/admin/quotes');

  return { success: true };
}

/**
 * Customer requests modification/negotiation. Leaves Quote SENT, advances Lead to NEGOTIATING.
 */
export async function requestProposalModification(token: string, rawInput: unknown) {
  if (!token || typeof token !== 'string') {
    throw new Error('Valid proposal token is required');
  }

  const data = modificationSchema.parse(rawInput);
  const now = new Date();

  const modifyRes = await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { accessToken: token },
      include: {
        lead: {
          include: { company: true, contact: true },
        },
      },
    });

    if (!quote) throw new Error('Proposal not found');
    if (quote.status === 'SUPERSEDED') throw new Error('This proposal has been superseded by a newer revision.');
    if (quote.status === 'ACCEPTED') throw new Error('This proposal was already accepted.');
    if (quote.status === 'REJECTED') throw new Error('This proposal was declined.');
    if (quote.expiresAt && quote.expiresAt.getTime() <= now.getTime()) {
      throw new Error('This proposal has expired. Please contact OpsVale for an updated quotation.');
    }

    // Advance Lead status to NEGOTIATING
    await tx.lead.update({
      where: { id: quote.leadId },
      data: { status: 'NEGOTIATING' },
    });

    // Log structured customer feedback activity
    await tx.leadActivity.create({
      data: {
        leadId: quote.leadId,
        type: 'CUSTOMER_RESPONSE',
        content: `Customer requested quotation adjustments on Rev ${quote.revision}: "${data.message}"`,
      },
    });

    return { quote };
  });

  // Emit event to centralized notification system
  emitNotificationEvent({
    type: 'CUSTOMER_REPLY_RECEIVED',
    category: 'CUSTOMER_ACTIVITY',
    priority: 'HIGH',
    title: `Customer Reply: ${modifyRes.quote.lead.company.name}`,
    message: `${modifyRes.quote.lead.contact.name} requested adjustment on Rev ${modifyRes.quote.revision}: "${data.message.slice(0, 80)}${data.message.length > 80 ? '...' : ''}"`,
    entityType: 'PROPOSAL',
    entityId: modifyRes.quote.id,
    actionUrl: `/admin/leads/${modifyRes.quote.leadId}`,
    metadata: {
      leadId: modifyRes.quote.leadId,
      leadCode: modifyRes.quote.lead.code,
      companyName: modifyRes.quote.lead.company.name,
      contactName: modifyRes.quote.lead.contact.name,
      revision: modifyRes.quote.revision,
      customerNotes: data.message,
    },
  }).catch((err) => console.error('Failed to emit CUSTOMER_REPLY_RECEIVED event:', err));

  revalidatePath(`/proposals/${token}`);
  revalidatePath('/admin');
  revalidatePath('/admin/leads');
  revalidatePath('/admin/quotes');

  return { success: true };
}

/**
 * Customer declines quotation. Transitions Quote to REJECTED and Lead to LOST.
 */
export async function declineProposal(token: string, rawInput: unknown = {}) {
  if (!token || typeof token !== 'string') {
    throw new Error('Valid proposal token is required');
  }

  const data = declineSchema.parse(rawInput);
  const now = new Date();

  const declineRes = await prisma.$transaction(async (tx) => {
    const updateRes = await tx.quote.updateMany({
      where: {
        accessToken: token,
        status: 'SENT',
      },
      data: {
        status: 'REJECTED',
        rejectedAt: now,
        rejectionReason: data.reason || 'Declined by customer via online portal',
      },
    });

    if (updateRes.count === 0) {
      const q = await tx.quote.findUnique({ where: { accessToken: token } });
      if (!q) throw new Error('Proposal not found');
      if (q.status === 'ACCEPTED') throw new Error('Cannot decline an already accepted proposal.');
      if (q.status === 'REJECTED') throw new Error('This proposal was already declined.');
      throw new Error(`Proposal is not in an actionable state (${q.status}).`);
    }

    const quote = await tx.quote.findUniqueOrThrow({
      where: { accessToken: token },
      include: {
        lead: {
          include: { company: true, contact: true },
        },
      },
    });

    // Advance Lead status to LOST
    await tx.lead.update({
      where: { id: quote.leadId },
      data: { status: 'LOST' },
    });

    // Log customer response activity
    await tx.leadActivity.create({
      data: {
        leadId: quote.leadId,
        type: 'CUSTOMER_RESPONSE',
        content: `Customer declined Quote Rev ${quote.revision}${
          data.reason ? ` (Reason: ${data.reason})` : ''
        }`,
      },
    });

    return { quote };
  });

  // Emit event to centralized notification system
  emitNotificationEvent({
    type: 'PROPOSAL_REJECTED',
    category: 'PROPOSAL',
    priority: 'NORMAL',
    title: `Proposal Declined: ${declineRes.quote.lead.company.name}`,
    message: `${declineRes.quote.lead.contact.name} declined Quote Rev ${declineRes.quote.revision}${data.reason ? ` (${data.reason})` : ''}.`,
    entityType: 'PROPOSAL',
    entityId: declineRes.quote.id,
    actionUrl: `/admin/leads/${declineRes.quote.leadId}`,
    metadata: {
      leadId: declineRes.quote.leadId,
      leadCode: declineRes.quote.lead.code,
      companyName: declineRes.quote.lead.company.name,
      contactName: declineRes.quote.lead.contact.name,
      revision: declineRes.quote.revision,
      reason: data.reason,
    },
  }).catch((err) => console.error('Failed to emit PROPOSAL_REJECTED event:', err));

  revalidatePath(`/proposals/${token}`);
  revalidatePath('/admin');
  revalidatePath('/admin/leads');
  revalidatePath('/admin/quotes');

  return { success: true };
}
