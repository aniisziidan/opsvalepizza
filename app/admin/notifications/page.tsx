import React from 'react';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getAdminNotifications } from '@/lib/notifications/queries';
import { NotificationsCenterView } from '@/components/admin/NotificationsCenterView';
import { NotificationCategory, NotificationPriority } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface NotificationsPageProps {
  searchParams: Promise<{
    filter?: string;
    page?: string;
  }>;
}

export default async function AdminNotificationsPage({ searchParams }: NotificationsPageProps) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const filter = (params.filter || 'ALL').toUpperCase();
  const page = parseInt(params.page || '1', 10) || 1;

  let category: NotificationCategory | 'ALL' | undefined;
  let priority: NotificationPriority | undefined;
  let unreadOnly = false;

  if (filter === 'UNREAD') {
    unreadOnly = true;
  } else if (filter === 'CRITICAL') {
    priority = 'CRITICAL';
  } else if (
    ['CUSTOMER_ACTIVITY', 'PROPOSAL', 'QUOTE', 'PRICING', 'LOGISTICS', 'SYSTEM', 'SECURITY'].includes(filter)
  ) {
    category = filter as NotificationCategory;
  }

  const result = await getAdminNotifications(admin.id, {
    category,
    priority,
    unreadOnly,
    page,
    pageSize: 20,
  });

  const serializedNotifications = result.items.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    readAt: n.readAt ? n.readAt.toISOString() : null,
  }));

  return (
    <NotificationsCenterView
      notifications={serializedNotifications}
      totalCount={result.totalCount}
      unreadCount={result.unreadCount}
      currentPage={result.page}
      totalPages={result.totalPages}
      selectedFilter={filter}
    />
  );
}
