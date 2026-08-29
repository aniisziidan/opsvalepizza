import { EventEmitter } from 'events';
import { NotificationType, NotificationCategory, NotificationPriority } from '@prisma/client';

export interface NotificationEvent {
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  recipientId?: string;
  incidentKey?: string;
  metadata?: Record<string, any>;
}

export interface AnalyticsAlertEvent extends NotificationEvent {
  type: 'ANALYTICS_TRAFFIC_OPPORTUNITY' | 'ANALYTICS_TRAFFIC_ANOMALY' | 'ANALYTICS_CONVERSION_DROP';
}

export interface AdminRealtimeEvent {
  id: string;
  type: 'NEW_LEAD' | 'PROPOSAL_ACCEPTED' | 'PROPOSAL_MODIFIED' | 'PROPOSAL_DECLINED' | 'PROPOSAL_VIEWED' | 'SYSTEM_ALERT' | string;
  title: string;
  message: string;
  href?: string;
  leadCode?: string;
  companyName?: string;
  timestamp: string;
}

// Global process-level event emitter to avoid garbage collection on hot reloads
const globalForEvents = globalThis as unknown as {
  notificationEmitter?: EventEmitter;
};

export const notificationEmitter =
  globalForEvents.notificationEmitter || new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.notificationEmitter = notificationEmitter;
}

// Max 100 concurrent listeners per server process to avoid memory leaks
notificationEmitter.setMaxListeners(100);

export function emitAdminNotification(event: Omit<AdminRealtimeEvent, 'id' | 'timestamp'>) {
  const fullEvent: AdminRealtimeEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  notificationEmitter.emit('admin_notification', fullEvent);
}

export function subscribeAdminNotifications(
  listener: (event: AdminRealtimeEvent) => void
): () => void {
  notificationEmitter.on('admin_notification', listener);
  return () => {
    notificationEmitter.off('admin_notification', listener);
  };
}
