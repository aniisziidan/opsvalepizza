import type { WebsiteHealthAlert } from './types';
import type { AnalyticsAlertEvent } from '@/lib/notifications/events';

/**
 * Translates the website-health alerts computed for the analytics dashboard
 * (`getVisitorIntelligenceData().alerts`) into dispatchable notification events.
 *
 * The dashboard already *detects* traffic surges, declines, and high exit
 * drop-offs, but those insights were only ever surfaced when an admin opened the
 * Visitor Intelligence page. This mapper lets a scheduled detection pass
 * (`/api/cron/detect-anomalies`) push the actionable ones through the standard
 * notification pipeline (in-app + web push + optional email).
 *
 * Rules:
 * - INFO alerts (e.g. "primary market") are contextual, not actionable, so they
 *   are not pushed.
 * - Each event carries a stable `incidentKey` derived from the alert id, so the
 *   dispatcher's dedup/cooldown suppresses repeat alerts for the same condition.
 */
export function mapHealthAlertsToNotificationEvents(
  alerts: WebsiteHealthAlert[],
): AnalyticsAlertEvent[] {
  const events: AnalyticsAlertEvent[] = [];

  for (const alert of alerts) {
    let type: AnalyticsAlertEvent['type'];
    let priority: 'HIGH' | 'NORMAL';

    switch (alert.type) {
      case 'OPPORTUNITY':
        type = 'ANALYTICS_TRAFFIC_OPPORTUNITY';
        priority = 'NORMAL';
        break;
      case 'WARNING':
        // Traffic/visitor decline warnings.
        type = 'ANALYTICS_TRAFFIC_ANOMALY';
        priority = 'HIGH';
        break;
      case 'ANOMALY':
        // High exit drop-off — a leak in the conversion path.
        type = 'ANALYTICS_CONVERSION_DROP';
        priority = 'HIGH';
        break;
      default:
        // INFO and any future non-actionable types are not pushed.
        continue;
    }

    events.push({
      type,
      category: 'ANALYTICS',
      priority,
      title: alert.title,
      message: alert.description,
      entityType: 'ANALYTICS',
      actionUrl: '/admin/visitors',
      incidentKey: `analytics:${alert.id}`,
      metadata: {
        metric: alert.metric,
        changePct: alert.changePct,
      },
    });
  }

  return events;
}
