import { prisma } from '@/lib/db';
import { storage } from '@/lib/storage';

export interface CleanupResult {
  expiredCount: number;
  deletedFilesCount: number;
  failedDeletionsCount: number;
}

/**
 * Idempotently cleans up expired temporary uploads.
 * Finds TemporaryUpload records with status = 'TEMPORARY' and expiresAt < now(),
 * deletes their corresponding physical storage files, and marks their DB status as 'EXPIRED'.
 */
export async function cleanExpiredUploads(): Promise<CleanupResult> {
  const now = new Date();

  // Find all expired temporary uploads
  const expiredRecords = await prisma.temporaryUpload.findMany({
    where: {
      status: 'TEMPORARY',
      expiresAt: { lt: now },
    },
    take: 100, // Batch limit for stability
  });

  let deletedFilesCount = 0;
  let failedDeletionsCount = 0;

  for (const record of expiredRecords) {
    try {
      await storage.delete(record.storageKey);
      deletedFilesCount++;
    } catch (err) {
      console.error(`Failed to delete storage key ${record.storageKey}:`, err);
      failedDeletionsCount++;
    }
  }

  if (expiredRecords.length > 0) {
    await prisma.temporaryUpload.updateMany({
      where: {
        id: { in: expiredRecords.map((r) => r.id) },
      },
      data: {
        status: 'EXPIRED',
      },
    });
  }

  return {
    expiredCount: expiredRecords.length,
    deletedFilesCount,
    failedDeletionsCount,
  };
}
