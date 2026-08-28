import { prisma } from '@/lib/db';
import { NotificationEvent } from './events';
import { sendWebPushNotification } from './webPush';
import { emailSender, DEFAULT_FROM_EMAIL } from '@/lib/email/transporter';
import { NotificationPriority } from '@prisma/client';

const SYSTEM_ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes deduplication cooldown

/**
 * Central event-driven notification dispatcher.
 * Call this from any business action or operational error handler.
 */
export async function emitNotificationEvent(event: NotificationEvent) {
  try {
    const priority = event.priority || 'NORMAL';
    const category = event.category;

    // 1. Incident Deduplication & Cooldown for System Alerts
    if (event.incidentKey) {
      const now = new Date();
      const existingIncident = await prisma.systemIncident.findUnique({
        where: { incidentKey: event.incidentKey },
      });

      if (event.type === 'SYSTEM_RECOVERED') {
        if (existingIncident && !existingIncident.resolved) {
          await prisma.systemIncident.update({
            where: { incidentKey: event.incidentKey },
            data: { resolved: true, resolvedAt: now },
          });
        }
      } else {
        if (existingIncident) {
          const timeSinceLastAlert = now.getTime() - existingIncident.lastAlertAt.getTime();

          // Suppress duplicate alert within cooldown window
          if (timeSinceLastAlert < SYSTEM_ALERT_COOLDOWN_MS && !existingIncident.resolved) {
            await prisma.systemIncident.update({
              where: { incidentKey: event.incidentKey },
              data: {
                count: { increment: 1 },
                updatedAt: now,
              },
            });
            return []; // Alert suppressed to avoid notification storm
          }

          // Update incident timestamp & reset resolved state
          await prisma.systemIncident.update({
            where: { incidentKey: event.incidentKey },
            data: {
              lastAlertAt: now,
              count: { increment: 1 },
              resolved: false,
              resolvedAt: null,
              title: event.title,
            },
          });
        } else {
          // Create new incident tracking record
          await prisma.systemIncident.create({
            data: {
              incidentKey: event.incidentKey,
              title: event.title,
              lastAlertAt: now,
              count: 1,
            },
          });
        }
      }
    }

    // 2. Resolve target recipients
    let recipientIds: string[] = [];

    if (event.recipientId) {
      recipientIds = [event.recipientId];
    } else {
      const activeAdmins = await prisma.adminUser.findMany({
        where: { active: true },
        select: { id: true, email: true },
      });
      recipientIds = activeAdmins.map((a) => a.id);
    }

    if (recipientIds.length === 0) {
      return [];
    }

    // 3. Fetch recipient preferences
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        userId: { in: recipientIds },
        category: category,
      },
    });

    const prefMap = new Map(preferences.map((p) => [p.userId, p]));

    const createdNotifications = [];

    for (const userId of recipientIds) {
      const userPref = prefMap.get(userId);
      const allowInApp = userPref ? userPref.inApp : true;
      const allowPush = userPref ? userPref.browserPush : true;
      const allowEmail = userPref ? userPref.email : priority === 'CRITICAL';

      // A. Persistent In-App Notification Record
      if (allowInApp) {
        const notif = await prisma.notification.create({
          data: {
            userId,
            type: event.type,
            category: event.category,
            priority: priority,
            title: event.title,
            message: event.message,
            entityType: event.entityType || null,
            entityId: event.entityId || null,
            actionUrl: event.actionUrl || null,
            metadata: event.metadata ? (event.metadata as any) : undefined,
          },
        });
        createdNotifications.push(notif);
      }

      // B. Web Push Delivery
      if (allowPush) {
        // Fire and forget push dispatch asynchronously so it never blocks database transactions
        dispatchPushToUser(userId, {
          title: event.title,
          body: event.message,
          url: event.actionUrl || '/admin/notifications',
          tag: event.incidentKey || `${event.category.toLowerCase()}-${event.entityId || Date.now()}`,
          data: {
            type: event.type,
            category: event.category,
            actionUrl: event.actionUrl,
          },
        }).catch((err) => {
          console.error(`Failed to dispatch Web Push to user ${userId}:`, err);
        });
      }

      // C. Optional Email Delivery for High Priority / Opted-In Users
      if (allowEmail) {
        dispatchEmailAlertToUser(userId, event).catch((err) => {
          console.error(`Failed to dispatch notification email to user ${userId}:`, err);
        });
      }
    }

    return createdNotifications;
  } catch (err: any) {
    console.error('emitNotificationEvent error:', err);
    return [];
  }
}

async function dispatchPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string; data?: any }
) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  for (const sub of subscriptions) {
    const result = await sendWebPushNotification(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      payload
    );

    if (result.shouldRemove) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    } else if (result.success) {
      await prisma.pushSubscription
        .update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => {});
    }
  }
}

async function dispatchEmailAlertToUser(userId: string, event: NotificationEvent) {
  const user = await prisma.adminUser.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user || !user.email) return;

  const subject = `[OpsVale Alert - ${event.priority || 'NORMAL'}] ${event.title}`;
  const textBody = `
Hello ${user.name},

${event.title}
${event.message}

Category: ${event.category}
Priority: ${event.priority || 'NORMAL'}
${event.actionUrl ? `Action Link: ${process.env.APP_URL || 'https://opsvale.com'}${event.actionUrl}` : ''}

--
OpsVale Notification Center
  `.trim();

  await emailSender.sendMail({
    from: DEFAULT_FROM_EMAIL,
    to: user.email,
    subject,
    text: textBody,
  });
}
