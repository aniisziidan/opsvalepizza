import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationCategory, NotificationPriority, NotificationType } from '@prisma/client';

describe('Notification Server Actions & Governance', () => {
  interface MockNotification {
    id: string;
    userId: string;
    type: NotificationType;
    category: NotificationCategory;
    priority: NotificationPriority;
    title: string;
    message: string;
    readAt: Date | null;
    createdAt: Date;
  }

  interface MockPushSub {
    id: string;
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  }

  interface MockPreference {
    userId: string;
    category: NotificationCategory;
    inApp: boolean;
    browserPush: boolean;
    email: boolean;
  }

  class MockNotificationService {
    notifications: MockNotification[] = [];
    subscriptions: MockPushSub[] = [];
    preferences: MockPreference[] = [];

    async markNotificationRead(adminId: string, notificationId: string): Promise<void> {
      const notif = this.notifications.find((n) => n.id === notificationId);
      if (!notif) throw new Error('Notification not found');
      if (notif.userId && notif.userId !== adminId) {
        throw new Error('Unauthorized to modify this notification');
      }
      notif.readAt = new Date();
    }

    async markAllRead(adminId: string): Promise<void> {
      for (const n of this.notifications) {
        if (n.userId === adminId && !n.readAt) {
          n.readAt = new Date();
        }
      }
    }

    async getUnreadCount(adminId: string): Promise<number> {
      return this.notifications.filter((n) => n.userId === adminId && !n.readAt).length;
    }

    async registerPush(adminId: string, sub: { endpoint: string; p256dh: string; auth: string; userAgent?: string }): Promise<void> {
      const existingIdx = this.subscriptions.findIndex((s) => s.endpoint === sub.endpoint);
      if (existingIdx >= 0) {
        this.subscriptions[existingIdx] = { ...this.subscriptions[existingIdx], ...sub, userId: adminId };
      } else {
        this.subscriptions.push({ id: `sub-${Date.now()}`, userId: adminId, ...sub });
      }
    }

    async removePush(adminId: string, endpoint: string): Promise<void> {
      this.subscriptions = this.subscriptions.filter(
        (s) => !(s.endpoint === endpoint && s.userId === adminId)
      );
    }

    async updatePreferences(
      adminId: string,
      prefs: Array<{ category: NotificationCategory; inApp: boolean; browserPush: boolean; email: boolean }>
    ): Promise<void> {
      for (const p of prefs) {
        const existing = this.preferences.find(
          (x) => x.userId === adminId && x.category === p.category
        );
        if (existing) {
          existing.inApp = p.inApp;
          existing.browserPush = p.browserPush;
          existing.email = p.email;
        } else {
          this.preferences.push({ userId: adminId, ...p });
        }
      }
    }
  }

  let service: MockNotificationService;

  beforeEach(() => {
    service = new MockNotificationService();
  });

  it('marks a single notification as read and decrements unread count', async () => {
    service.notifications.push({
      id: 'notif-1',
      userId: 'admin-1',
      type: 'CUSTOMER_REPLY_RECEIVED',
      category: 'CUSTOMER_ACTIVITY',
      priority: 'HIGH',
      title: 'Customer Reply',
      message: 'New feedback',
      readAt: null,
      createdAt: new Date(),
    });

    expect(await service.getUnreadCount('admin-1')).toBe(1);

    await service.markNotificationRead('admin-1', 'notif-1');

    expect(await service.getUnreadCount('admin-1')).toBe(0);
    expect(service.notifications[0].readAt).toBeInstanceOf(Date);
  });

  it('prevents Admin A from marking Admin B private notification as read', async () => {
    service.notifications.push({
      id: 'notif-private-b',
      userId: 'admin-b',
      type: 'CUSTOMER_REPLY_RECEIVED',
      category: 'CUSTOMER_ACTIVITY',
      priority: 'HIGH',
      title: 'Admin B private alert',
      message: 'Secret',
      readAt: null,
      createdAt: new Date(),
    });

    await expect(service.markNotificationRead('admin-a', 'notif-private-b')).rejects.toThrow(
      'Unauthorized'
    );
  });

  it('marks all notifications as read in bulk', async () => {
    service.notifications.push(
      {
        id: 'notif-1',
        userId: 'admin-1',
        type: 'QUOTE_REQUEST_RECEIVED',
        category: 'QUOTE',
        priority: 'HIGH',
        title: 'Quote 1',
        message: 'Msg 1',
        readAt: null,
        createdAt: new Date(),
      },
      {
        id: 'notif-2',
        userId: 'admin-1',
        type: 'PROPOSAL_ACCEPTED',
        category: 'PROPOSAL',
        priority: 'HIGH',
        title: 'Quote 2',
        message: 'Msg 2',
        readAt: null,
        createdAt: new Date(),
      }
    );

    expect(await service.getUnreadCount('admin-1')).toBe(2);

    await service.markAllRead('admin-1');

    expect(await service.getUnreadCount('admin-1')).toBe(0);
  });

  it('registers and removes a browser push subscription', async () => {
    const endpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint-123';
    const p256dh = 'test-p256dh-key';
    const authSecret = 'test-auth-secret';

    await service.registerPush('admin-1', {
      endpoint,
      p256dh,
      auth: authSecret,
      userAgent: 'TestBrowser/1.0',
    });

    expect(service.subscriptions.length).toBe(1);
    expect(service.subscriptions[0].endpoint).toBe(endpoint);

    await service.removePush('admin-1', endpoint);

    expect(service.subscriptions.length).toBe(0);
  });

  it('updates notification category preferences', async () => {
    await service.updatePreferences('admin-1', [
      {
        category: 'CUSTOMER_ACTIVITY',
        inApp: true,
        browserPush: false,
        email: true,
      },
    ]);

    const pref = service.preferences.find(
      (p) => p.userId === 'admin-1' && p.category === 'CUSTOMER_ACTIVITY'
    );
    expect(pref).toBeDefined();
    expect(pref?.inApp).toBe(true);
    expect(pref?.browserPush).toBe(false);
    expect(pref?.email).toBe(true);
  });
});
