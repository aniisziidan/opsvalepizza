import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUnreadNotificationCount, getLatestUnreadNotifications } from '@/lib/notifications/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [unreadCount, latestItems] = await Promise.all([
    getUnreadNotificationCount(session.user.id),
    getLatestUnreadNotifications(session.user.id, 5),
  ]);

  return NextResponse.json({
    unreadCount,
    latestItems,
  });
}
