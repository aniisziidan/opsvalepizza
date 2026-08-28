import { prisma } from '@/lib/db';
import { emailSender } from '@/lib/email/transporter';

/**
 * Concurrency-safe processor for an OutboxEmail row.
 * Features atomic row claiming, stuck job recovery, and transactional CRM progression.
 */
export async function processOutboxEmail(outboxEmailId: string): Promise<{
  claimed: boolean;
  success: boolean;
  error?: string;
}> {
  const timeoutThreshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes

  // 1. Atomic claim: transition from PENDING or stuck PROCESSING to PROCESSING
  const claim = await prisma.outboxEmail.updateMany({
    where: {
      id: outboxEmailId,
      OR: [
        { status: 'PENDING' },
        { status: 'PROCESSING', createdAt: { lt: timeoutThreshold } },
      ],
    },
    data: {
      status: 'PROCESSING',
    },
  });

  if (claim.count === 0) {
    // Row was already claimed by another process or already delivered
    return { claimed: false, success: false };
  }

  // 2. Fetch full email details
  const outboxRecord = await prisma.outboxEmail.findUnique({
    where: { id: outboxEmailId },
    include: { quote: true },
  });

  if (!outboxRecord) {
    return { claimed: true, success: false, error: 'Outbox record not found' };
  }

  try {
    // 3. Attempt transmission via configured provider (SMTP / Console)
    await emailSender.sendMail({
      from: outboxRecord.from,
      to: outboxRecord.to,
      subject: outboxRecord.subject,
      text: outboxRecord.text,
      html: outboxRecord.html || undefined,
    });

    const now = new Date();

    // 4. Provider succeeded -> advance Quote and CRM in ONE atomic transaction
    await prisma.$transaction(async (tx) => {
      // Mark outbox row as SENT
      await tx.outboxEmail.update({
        where: { id: outboxRecord.id },
        data: {
          status: 'SENT',
          sentAt: now,
          lastError: null,
        },
      });

      if (outboxRecord.quoteId && outboxRecord.quote) {
        const leadId = outboxRecord.quote.leadId;

        // Mark this quote as SENT
        await tx.quote.update({
          where: { id: outboxRecord.quoteId },
          data: {
            status: 'SENT',
            sentAt: now,
          },
        });

        // Supersede previous SENT quotes for this lead (they are no longer the active offer)
        await tx.quote.updateMany({
          where: {
            leadId,
            id: { not: outboxRecord.quoteId },
            status: 'SENT',
          },
          data: { status: 'SUPERSEDED' },
        });

        // Advance lead status to QUOTE_SENT
        await tx.lead.update({
          where: { id: leadId },
          data: { status: 'QUOTE_SENT' },
        });
      }
    });

    return { claimed: true, success: true };
  } catch (err: any) {
    // 5. Provider failed -> mark FAILED and record error (Quote remains DISPATCHING for admin retry)
    const errorMessage = err?.message || 'Email delivery failed';

    await prisma.outboxEmail.update({
      where: { id: outboxRecord.id },
      data: {
        status: 'FAILED',
        attempts: { increment: 1 },
        lastError: errorMessage,
      },
    });

    // Centralized notification for delivery failure
    try {
      const { emitNotificationEvent } = await import('@/lib/notifications/dispatcher');
      await emitNotificationEvent({
        type: 'EMAIL_DELIVERY_FAILED',
        category: 'SYSTEM',
        priority: 'HIGH',
        incidentKey: `email_fail_${outboxRecord.to}`,
        title: `Email Delivery Failed: ${outboxRecord.to}`,
        message: `Failed to deliver "${outboxRecord.subject}": ${errorMessage}`,
        entityType: 'QUOTE',
        entityId: outboxRecord.quoteId || undefined,
        actionUrl: outboxRecord.quoteId ? `/admin/quotes` : undefined,
      });
    } catch {
      // Don't fail the outbox error return
    }

    return {
      claimed: true,
      success: false,
      error: errorMessage,
    };
  }
}
