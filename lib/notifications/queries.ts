import { prisma } from '@/lib/db';
import { NotificationCategory, NotificationPriority, Prisma } from '@prisma/client';

export interface GetNotificationsOptions {
  category?: NotificationCategory | 'ALL';
  priority?: NotificationPriority;
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export async function getAdminNotifications(userId: string, options: GetNotificationsOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(options.category && options.category !== 'ALL' ? { category: options.category } : {}),
    ...(options.priority ? { priority: options.priority } : {}),
    ...(options.unreadOnly ? { readAt: null } : {}),
  };

  const [items, totalCount, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
  ]);

  return {
    items,
    totalCount,
    unreadCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!userId) return 0;
  return prisma.notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

export async function getLatestUnreadNotifications(userId: string, limit = 5) {
  if (!userId) return [];
  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getNotificationPreferences(userId: string) {
  if (!userId) return [];
  return prisma.notificationPreference.findMany({
    where: { userId },
    orderBy: { category: 'asc' },
  });
}

export async function getPushSubscriptions(userId: string) {
  if (!userId) return [];
  return prisma.pushSubscription.findMany({
    where: { userId },
    select: {
      id: true,
      endpoint: true,
      userAgent: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
