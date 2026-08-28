import { NotificationType, NotificationCategory, NotificationPriority } from '@prisma/client';

export type { NotificationType, NotificationCategory, NotificationPriority };

export interface BaseNotificationEvent {
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message: string;
  entityType?: string; // e.g. "LEAD", "PROPOSAL", "QUOTE", "SYSTEM", "PRICING", "LOGISTICS"
  entityId?: string;
  actionUrl?: string;
  recipientId?: string; // If omitted, broadcasts to all active admin users
  incidentKey?: string; // For deduplication & cooldown
  metadata?: Record<string, any>;
}

export interface CustomerReplyEvent extends BaseNotificationEvent {
  type: 'CUSTOMER_REPLY_RECEIVED';
  category: 'CUSTOMER_ACTIVITY';
  priority: 'HIGH';
  metadata: {
    leadId: string;
    leadCode: string;
    companyName: string;
    contactName: string;
    revision: number;
    customerNotes: string;
  };
}

export interface ProposalAcceptedEvent extends BaseNotificationEvent {
  type: 'PROPOSAL_ACCEPTED';
  category: 'PROPOSAL';
  priority: 'HIGH';
  metadata: {
    leadId: string;
    leadCode: string;
    companyName: string;
    contactName: string;
    revision: number;
    orderQuantity: number;
    unitPriceEur: string;
    totalEur: string;
    customerNotes?: string;
  };
}

export interface ProposalRejectedEvent extends BaseNotificationEvent {
  type: 'PROPOSAL_REJECTED';
  category: 'PROPOSAL';
  priority: 'NORMAL';
  metadata: {
    leadId: string;
    leadCode: string;
    companyName: string;
    contactName: string;
    revision: number;
    reason?: string;
  };
}

export interface QuoteRequestReceivedEvent extends BaseNotificationEvent {
  type: 'QUOTE_REQUEST_RECEIVED';
  category: 'CUSTOMER_ACTIVITY';
  priority: 'HIGH';
  metadata: {
    leadId: string;
    leadCode: string;
    companyName: string;
    contactName: string;
    email: string;
    boxSpec: string;
    monthlyVolume: number;
    city: string;
    countryCode: string;
  };
}

export interface DocumentUploadedEvent extends BaseNotificationEvent {
  type: 'DOCUMENT_UPLOADED';
  category: 'CUSTOMER_ACTIVITY';
  priority: 'NORMAL';
  metadata: {
    leadId: string;
    leadCode: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  };
}

export interface SystemAlertEvent extends BaseNotificationEvent {
  type:
    | 'SYSTEM_HEALTH_ALERT'
    | 'DATABASE_UNAVAILABLE'
    | 'BACKUP_FAILED'
    | 'EMAIL_DELIVERY_FAILED'
    | 'PDF_GENERATION_FAILED'
    | 'PRICING_IMPORT_FAILED'
    | 'PRICING_VERSION_CONFLICT'
    | 'LOGISTICS_CONFIGURATION_ALERT'
    | 'SYSTEM_RECOVERED';
  incidentKey?: string; // Key for deduplication / cooldown (e.g. "db_conn", "email_outbox_retry")
  metadata?: Record<string, any>;
}

export interface AnalyticsAlertEvent extends BaseNotificationEvent {
  type:
    | 'ANALYTICS_TRAFFIC_ANOMALY'
    | 'ANALYTICS_CONVERSION_DROP'
    | 'ANALYTICS_TRAFFIC_OPPORTUNITY';
  category: 'ANALYTICS';
  priority?: 'HIGH' | 'NORMAL';
  metadata?: {
    metric?: string;
    changePct?: number;
    territory?: string;
    campaign?: string;
  };
}

export type NotificationEvent =
  | CustomerReplyEvent
  | ProposalAcceptedEvent
  | ProposalRejectedEvent
  | QuoteRequestReceivedEvent
  | DocumentUploadedEvent
  | SystemAlertEvent
  | AnalyticsAlertEvent
  | BaseNotificationEvent;
