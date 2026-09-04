import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { storage } from '@/lib/storage';
import { getClientIp, checkRateLimit, createRateLimitResponse } from '@/lib/ratelimit/rateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // This endpoint is unauthenticated and runs a DB query + notification dispatch
  // per call, so it is rate-limited to stop an anonymous flood from amplifying
  // load. The limit is generous enough for normal liveness/uptime probing.
  const rate = checkRateLimit(`health:${getClientIp(req)}`, { maxRequests: 30, windowSeconds: 60 });
  if (!rate.success) {
    return createRateLimitResponse(rate);
  }

  const startTime = Date.now();
  let dbStatus = 'down';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = 'up';
  } catch {
    dbStatus = 'down';
  }

  let storageStatus = 'down';
  try {
    if (storage && typeof storage.save === 'function') {
      storageStatus = 'up';
    }
  } catch {
    storageStatus = 'down';
  }

  const isHealthy = dbStatus === 'up';

  // System incident alert / recovery emission
  try {
    const { emitNotificationEvent } = await import('@/lib/notifications/dispatcher');
    if (!isHealthy) {
      emitNotificationEvent({
        type: 'DATABASE_UNAVAILABLE',
        category: 'SYSTEM',
        priority: 'CRITICAL',
        incidentKey: 'db_health_failure',
        title: 'Database Unavailable / High Latency',
        message: 'Health probe detected database connectivity failure.',
        actionUrl: '/admin/dashboard',
      }).catch(() => {});
    } else {
      emitNotificationEvent({
        type: 'SYSTEM_RECOVERED',
        category: 'SYSTEM',
        priority: 'NORMAL',
        incidentKey: 'db_health_failure',
        title: 'Database Connectivity Restored',
        message: `Health probe confirmed database is online (Latency: ${dbLatencyMs}ms).`,
        actionUrl: '/admin/dashboard',
      }).catch(() => {});
    }
  } catch {
    // Non-blocking for probe
  }

  // Intentionally minimal, non-sensitive body: no runtime version, memory, or
  // internal storage-adapter details are exposed on this public endpoint to
  // avoid fingerprinting. Detailed diagnostics live behind the admin dashboard.
  const responseBody = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    totalResponseTimeMs: Date.now() - startTime,
    checks: {
      database: {
        status: dbStatus,
      },
      storage: {
        status: storageStatus,
      },
    },
  };

  return NextResponse.json(responseBody, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
