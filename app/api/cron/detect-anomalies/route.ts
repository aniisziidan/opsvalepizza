import { NextResponse } from 'next/server';
import { getVisitorIntelligenceData } from '@/lib/analytics/queries';
import { mapHealthAlertsToNotificationEvents } from '@/lib/analytics/anomalyEmission';
import { emitNotificationEvent } from '@/lib/notifications/dispatcher';
import { isCronAuthorized, isProductionEnv } from '@/lib/cron/auth';

/**
 * Scheduled website-health / conversion anomaly detection. Recomputes the
 * analytics health alerts over a rolling window and pushes the actionable ones
 * (traffic surge/decline, high exit drop-off) into the notification center.
 * The dispatcher dedupes by `incidentKey`, so re-running frequently is safe and
 * will not spam admins for the same standing condition.
 *
 * Trigger from the host scheduler, e.g.:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     http://127.0.0.1:3010/api/cron/detect-anomalies
 */
export async function POST(req: Request) {
  // Fail closed: an unset CRON_SECRET is rejected in production (never left unauthenticated).
  const auth = isCronAuthorized(
    req.headers.get('authorization'),
    process.env.CRON_SECRET,
    isProductionEnv(),
  );
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
  }

  try {
    const data = await getVisitorIntelligenceData({ range: '7D' });
    const events = mapHealthAlertsToNotificationEvents(data.alerts);

    let emitted = 0;
    for (const event of events) {
      await emitNotificationEvent(event);
      emitted += 1;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      detected: data.alerts.length,
      emitted,
    });
  } catch (error) {
    console.error('Failed to run anomaly detection cron:', error);
    return NextResponse.json({ error: 'Anomaly detection execution failed' }, { status: 500 });
  }
}
