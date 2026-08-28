'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { NotificationCategory } from '@prisma/client';

const markReadSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID is required'),
});

const pushSubSchema = z.object({
  endpoint: z.string().url('Valid push endpoint URL is required'),
  p256dh: z.string().min(1, 'p256dh key is required'),
  auth: z.string().min(1, 'auth secret is required'),
  userAgent: z.string().optional(),
});

const preferenceItemSchema = z.object({
  category: z.nativeEnum(NotificationCategory),
  inApp: z.boolean(),
  browserPush: z.boolean(),
  email: z.boolean(),
});

const preferencesListSchema = z.array(preferenceItemSchema);

/**
 * Marks a single notification as read by its owner.
 */
export async function markNotificationReadAction(notificationId: string) {
  const admin = await requireAdmin();

  const validated = markReadSchema.parse({ notificationId });

  const notif = await prisma.notification.findUnique({
    where: { id: validated.notificationId },
  });

  if (!notif) {
    throw new Error('Notification not found');
  }

  // Authorization check: User must own the notification
  if (notif.userId && notif.userId !== admin.id) {
    throw new Error('Unauthorized to modify this notification');
  }

  await prisma.notification.update({
    where: { id: validated.notificationId },
    data: { readAt: new Date() },
  });

  revalidatePath('/admin');
  revalidatePath('/admin/notifications');
  return { success: true };
}

/**
 * Marks all unread notifications for the logged-in admin as read.
 */
export async function markAllNotificationsReadAction() {
  const admin = await requireAdmin();

  await prisma.notification.updateMany({
    where: {
      userId: admin.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath('/admin');
  revalidatePath('/admin/notifications');
  return { success: true };
}

/**
 * Saves or updates browser Web Push subscription for the logged-in admin.
 */
export async function registerPushSubscriptionAction(rawSubscription: unknown) {
  const admin = await requireAdmin();

  const sub = pushSubSchema.parse(rawSubscription);

  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId: admin.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      userAgent: sub.userAgent || null,
    },
    update: {
      userId: admin.id,
      p256dh: sub.p256dh,
      auth: sub.auth,
      userAgent: sub.userAgent || null,
      lastUsedAt: new Date(),
    },
  });

  return { success: true };
}

/**
 * Removes a browser Web Push subscription for the logged-in admin.
 */
export async function removePushSubscriptionAction(endpoint: string) {
  const admin = await requireAdmin();

  if (!endpoint) throw new Error('Endpoint is required');

  await prisma.pushSubscription.deleteMany({
    where: {
      endpoint,
      userId: admin.id,
    },
  });

  return { success: true };
}

/**
 * Updates notification preferences per category for the logged-in admin.
 */
export async function updateNotificationPreferencesAction(rawPreferences: unknown) {
  const admin = await requireAdmin();

  const preferences = preferencesListSchema.parse(rawPreferences);

  await prisma.$transaction(
    preferences.map((pref) =>
      prisma.notificationPreference.upsert({
        where: {
          userId_category: {
            userId: admin.id,
            category: pref.category,
          },
        },
        create: {
          userId: admin.id,
          category: pref.category,
          inApp: pref.inApp,
          browserPush: pref.browserPush,
          email: pref.email,
        },
        update: {
          inApp: pref.inApp,
          browserPush: pref.browserPush,
          email: pref.email,
        },
      })
    )
  );

  revalidatePath('/admin/settings');
  return { success: true };
}
