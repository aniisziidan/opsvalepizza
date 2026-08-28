'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { LeadStatus, LEAD_STATUS_LABEL } from '@/lib/types';
import { emailSender } from '@/lib/email/transporter';

const updateStatusSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  newStatus: z.enum([
    'NEW',
    'REVIEWING',
    'NEED_MORE_INFO',
    'QUOTE_PREPARED',
    'QUOTE_SENT',
    'NEGOTIATING',
    'WON',
    'LOST',
  ] as const),
});

const addNoteSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  noteText: z
    .string()
    .trim()
    .min(1, 'Note content cannot be empty')
    .max(2000, 'Note cannot exceed 2000 characters'),
});

const directEmailSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  body: z.string().trim().min(1, 'Body is required').max(10000),
});

/**
 * Server action to update a Lead's status with atomic activity history logging.
 */
export async function updateLeadStatus(rawLeadId: string, rawNewStatus: string) {
  const admin = await requireAdmin();

  const validated = updateStatusSchema.parse({
    leadId: rawLeadId,
    newStatus: rawNewStatus,
  });

  const { leadId, newStatus } = validated;

  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({
      where: { id: leadId },
      select: { id: true, status: true },
    });

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const oldStatus = lead.status as LeadStatus;
    if (oldStatus === newStatus) {
      return { noop: true };
    }

    await tx.lead.update({
      where: { id: leadId },
      data: { status: newStatus },
    });

    const oldLabel = LEAD_STATUS_LABEL[oldStatus] || oldStatus;
    const newLabel = LEAD_STATUS_LABEL[newStatus] || newStatus;

    await tx.leadActivity.create({
      data: {
        leadId,
        type: 'STATUS_CHANGE',
        authorId: admin.id,
        content: `Status changed: ${oldLabel} → ${newLabel}`,
      },
    });

    return { noop: false, oldStatus, newStatus };
  });

  revalidatePath('/admin');
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath('/admin/dashboard');

  return { success: true, ...result };
}

/**
 * Server action to add an internal note to a Lead's activity history.
 */
export async function addLeadNote(rawLeadId: string, rawNoteText: string) {
  const admin = await requireAdmin();

  const validated = addNoteSchema.parse({
    leadId: rawLeadId,
    noteText: rawNoteText,
  });

  const { leadId, noteText } = validated;

  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    await tx.leadActivity.create({
      data: {
        leadId,
        type: 'NOTE',
        authorId: admin.id,
        content: noteText,
      },
    });
  });

  revalidatePath('/admin');
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath('/admin/dashboard');

  return { success: true };
}

/**
 * Server action to send a direct transactional email to a lead contact and log in history.
 */
export async function sendDirectLeadEmail(rawLeadId: string, payload: { subject: string; body: string }) {
  const admin = await requireAdmin();

  const validated = directEmailSchema.parse({
    leadId: rawLeadId,
    subject: payload.subject,
    body: payload.body,
  });

  const { leadId, subject, body } = validated;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { contact: true, company: true },
  });

  if (!lead || !lead.contact.email) {
    throw new Error('Lead contact email not found');
  }

  // 1. Transmit email via email sender
  const sendRes = await emailSender.sendMail({
    from: `"OpsVale Logistics" <${process.env.SMTP_USER || 'no-reply@opsvale.com'}>`,
    to: lead.contact.email,
    subject,
    text: body,
    html: `<div style="font-family: sans-serif; line-height: 1.6; color: #041632; white-space: pre-wrap;">${body}</div>`,
  });

  // 2. Log in activity history
  await prisma.leadActivity.create({
    data: {
      leadId,
      type: 'EMAIL',
      authorId: admin.id,
      content: `Sent direct email to ${lead.contact.email} ("${subject}")`,
    },
  });

  revalidatePath('/admin');
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath('/admin/dashboard');

  return { success: true, sent: sendRes.sent };
}
