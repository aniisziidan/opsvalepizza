import { NextResponse } from 'next/server';
import { performOffsiteDatabaseBackup } from '@/lib/storage/offsiteBackup';
import { isCronAuthorized, isProductionEnv } from '@/lib/cron/auth';

export const dynamic = 'force-dynamic';

/**
 * Scheduled offsite database backup synchronization.
 * Uploads latest compressed PostgreSQL backup snapshot to configured cloud storage (S3 / R2).
 *
 * Trigger from the host scheduler, e.g.:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     http://127.0.0.1:3010/api/cron/backup-offsite
 */
export async function POST(req: Request) {
  const auth = isCronAuthorized(
    req.headers.get('authorization'),
    process.env.CRON_SECRET,
    isProductionEnv(),
  );

  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
  }

  try {
    const result = await performOffsiteDatabaseBackup();
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Offsite backup failed' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      backupKey: result.backupKey,
      sizeBytes: result.sizeBytes,
      provider: result.provider,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Offsite backup execution failed' },
      { status: 500 },
    );
  }
}
