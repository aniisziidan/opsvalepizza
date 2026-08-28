import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationCategory, NotificationPriority, NotificationType } from '@prisma/client';

describe('Notification Dispatcher & Incident Cooldown Engine', () => {
  interface MockNotification {
    id: string;
    userId: string;
    type: NotificationType;
    category: NotificationCategory;
    priority: NotificationPriority;
    title: string;
    message: string;
    entityType?: string | null;
    entityId?: string | null;
    actionUrl?: string | null;
    metadata?: any;
    readAt: Date | null;
    createdAt: Date;
  }

  interface MockSystemIncident {
    id: string;
    incidentKey: string;
    title: string;
    lastAlertAt: Date;
    count: number;
    resolved: boolean;
    resolvedAt: Date | null;
  }

  interface MockPreference {
    userId: string;
    category: NotificationCategory;
    inApp: boolean;
    browserPush: boolean;
    email: boolean;
  }

  class MockNotificationEngine {
    notifications: MockNotification[] = [];
    incidents: MockSystemIncident[] = [];
    preferences: MockPreference[] = [];
    pushDispatches: Array<{ userId: string; title: string }> = [];
    emailDispatches: Array<{ userId: string; subject: string }> = [];

    cooldownMs = 5 * 60 * 1000; // 5 mins

    async emitEvent(event: {
      type: NotificationType;
      category: NotificationCategory;
      priority?: NotificationPriority;
      title: string;
      message: string;
      entityType?: string;
      entityId?: string;
      actionUrl?: string;
      incidentKey?: string;
      recipientId?: string;
      metadata?: any;
    }): Promise<MockNotification[]> {
      const priority = event.priority || 'NORMAL';
      const now = new Date();

      // 1. Incident Deduplication
      if (event.incidentKey) {
        const incident = this.incidents.find((i) => i.incidentKey === event.incidentKey);

        if (event.type === 'SYSTEM_RECOVERED') {
          if (incident && !incident.resolved) {
            incident.resolved = true;
            incident.resolvedAt = now;
          }
        } else {
          if (incident) {
            const timeSinceLast = now.getTime() - incident.lastAlertAt.getTime();
            if (timeSinceLast < this.cooldownMs && !incident.resolved) {
              incident.count += 1;
              return []; // Suppressed
            }
            incident.lastAlertAt = now;
            incident.count += 1;
            incident.resolved = false;
            incident.resolvedAt = null;
          } else {
            this.incidents.push({
              id: `inc-${Date.now()}`,
              incidentKey: event.incidentKey,
              title: event.title,
              lastAlertAt: now,
              count: 1,
              resolved: false,
              resolvedAt: null,
            });
          }
        }
      }

      // 2. Recipients
      const recipients = event.recipientId ? [event.recipientId] : ['admin-1', 'admin-2'];
      const created: MockNotification[] = [];

      for (const userId of recipients) {
        const pref = this.preferences.find(
          (p) => p.userId === userId && p.category === event.category
        );
        const inApp = pref ? pref.inApp : true;
        const push = pref ? pref.browserPush : true;
        const email = pref ? pref.email : priority === 'CRITICAL';

        if (inApp) {
          const notif: MockNotification = {
            id: `notif-${Date.now()}-${Math.random()}`,
            userId,
            type: event.type,
            category: event.category,
            priority,
            title: event.title,
            message: event.message,
            entityType: event.entityType || null,
            entityId: event.entityId || null,
            actionUrl: event.actionUrl || null,
            metadata: event.metadata || null,
            readAt: null,
            createdAt: now,
          };
          this.notifications.push(notif);
          created.push(notif);
        }

        if (push) {
          this.pushDispatches.push({ userId, title: event.title });
        }

        if (email) {
          this.emailDispatches.push({
            userId,
            subject: `[OpsVale Alert - ${priority}] ${event.title}`,
          });
        }
      }

      return created;
    }
  }

  let engine: MockNotificationEngine;

  beforeEach(() => {
    engine = new MockNotificationEngine();
  });

  it('emits a customer reply event and persists notification to active admins', async () => {
    const created = await engine.emitEvent({
      type: 'CUSTOMER_REPLY_RECEIVED',
      category: 'CUSTOMER_ACTIVITY',
      priority: 'HIGH',
      title: 'Customer Reply: Pizzeria Napoli',
      message: 'Marco requested 15,000 boxes adjustment.',
      actionUrl: '/admin/leads/lead-123',
      metadata: {
        leadId: 'lead-123',
        companyName: 'Pizzeria Napoli',
      },
    });

    expect(created.length).toBe(2);
    expect(created[0].title).toBe('Customer Reply: Pizzeria Napoli');
    expect(created[0].category).toBe('CUSTOMER_ACTIVITY');
    expect(created[0].priority).toBe('HIGH');
    expect(created[0].readAt).toBeNull();
    expect(engine.pushDispatches.length).toBe(2);
  });

  it('deduplicates recurring system incidents within the cooldown window', async () => {
    const incidentKey = 'db_ping_failure_test';

    // First alert -> should create notification
    const firstCall = await engine.emitEvent({
      type: 'DATABASE_UNAVAILABLE',
      category: 'SYSTEM',
      priority: 'CRITICAL',
      incidentKey,
      title: 'Database Unavailable',
      message: 'DB query failed',
    });

    expect(firstCall.length).toBe(2);
    expect(engine.incidents[0].count).toBe(1);

    // Immediate second alert with same incidentKey -> should be suppressed
    const secondCall = await engine.emitEvent({
      type: 'DATABASE_UNAVAILABLE',
      category: 'SYSTEM',
      priority: 'CRITICAL',
      incidentKey,
      title: 'Database Unavailable',
      message: 'DB query failed again',
    });

    expect(secondCall.length).toBe(0);
    expect(engine.incidents[0].count).toBe(2);
    expect(engine.incidents[0].resolved).toBe(false);

    // Recovery event -> marks incident resolved
    await engine.emitEvent({
      type: 'SYSTEM_RECOVERED',
      category: 'SYSTEM',
      priority: 'NORMAL',
      incidentKey,
      title: 'Database Restored',
      message: 'DB is back online',
    });

    expect(engine.incidents[0].resolved).toBe(true);
  });

  it('respects user preference to disable push or email notifications', async () => {
    engine.preferences.push({
      userId: 'admin-1',
      category: 'CUSTOMER_ACTIVITY',
      inApp: true,
      browserPush: false, // Push disabled
      email: false,
    });

    await engine.emitEvent({
      type: 'CUSTOMER_REPLY_RECEIVED',
      category: 'CUSTOMER_ACTIVITY',
      priority: 'NORMAL',
      title: 'New Customer Message',
      message: 'Hello OpsVale',
      recipientId: 'admin-1',
    });

    expect(engine.notifications.length).toBe(1);
    expect(engine.pushDispatches.length).toBe(0); // No push dispatched
    expect(engine.emailDispatches.length).toBe(0);
  });
});
