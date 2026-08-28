import { prisma } from '@/lib/db';

export interface PruneResult {
  eventsDeleted: number;
  sessionsDeleted: number;
  prunedAt: Date;
}

export async function pruneExpiredAnalyticsData(): Promise<PruneResult> {
  const eventRetentionDays = parseInt(process.env.ANALYTICS_RETENTION_DAYS || '365', 10);
  const sessionRetentionDays = parseInt(process.env.SESSION_RETENTION_DAYS || '180', 10);

  const eventThreshold = new Date(Date.now() - eventRetentionDays * 24 * 60 * 60 * 1000);
  const sessionThreshold = new Date(Date.now() - sessionRetentionDays * 24 * 60 * 60 * 1000);

  // 1. Delete events older than eventThreshold
  const eventsResult = await prisma.analyticsEvent.deleteMany({
    where: {
      createdAt: { lt: eventThreshold },
    },
  });

  // 2. Delete sessions older than sessionThreshold with no remaining events
  const sessionsResult = await prisma.visitorSession.deleteMany({
    where: {
      startedAt: { lt: sessionThreshold },
      events: { none: {} },
    },
  });

  return {
    eventsDeleted: eventsResult.count,
    sessionsDeleted: sessionsResult.count,
    prunedAt: new Date(),
  };
}
