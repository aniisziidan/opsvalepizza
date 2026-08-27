'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { LeadStatus, LEAD_STATUS_LABEL } from '@/lib/types';

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
