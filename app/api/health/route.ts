import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
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
  let storageType = 'unknown';
  try {
    if (storage && typeof storage.save === 'function') {
      storageType = (storage as any).name || 'configured';
      storageStatus = 'up';
    }
  } catch {
    storageStatus = 'down';
  }

  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  const isHealthy = dbStatus === 'up';

  const responseBody = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    totalResponseTimeMs: Date.now() - startTime,
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      storage: {
        status: storageStatus,
        type: storageType,
      },
    },
    system: {
      uptimeSeconds,
      nodeVersion: process.version,
      memoryRssMb: Math.round(memoryUsage.rss / (1024 * 1024)),
      memoryHeapUsedMb: Math.round(memoryUsage.heapUsed / (1024 * 1024)),
    },
  };

  return NextResponse.json(responseBody, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
