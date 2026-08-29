import { NextResponse } from 'next/server';
import { pruneExpiredAnalyticsData } from '@/lib/analytics/retention';
import { isCronAuthorized, isProductionEnv } from '@/lib/cron/auth';

/**
 * Scheduled GDPR data-retention purge for analytics. Deletes events/sessions older than the
 * configured retention windows (ANALYTICS_RETENTION_DAYS / SESSION_RETENTION_DAYS).
 *
 * Trigger from the host scheduler, e.g.:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     http://127.0.0.1:3010/api/cron/prune-analytics
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
    const result = await pruneExpiredAnalyticsData();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error('Failed to run analytics retention prune cron:', error);
    return NextResponse.json({ error: 'Analytics prune execution failed' }, { status: 500 });
  }
}
