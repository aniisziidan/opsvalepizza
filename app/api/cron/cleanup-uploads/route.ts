import { NextResponse } from 'next/server';
import { cleanExpiredUploads } from '@/lib/storage/cleanup';

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  // Verify CRON_SECRET if configured
  if (cronSecret && cronSecret.trim().length > 0) {
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (token !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
    }
  }

  try {
    const result = await cleanExpiredUploads();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error('Failed to run upload cleanup cron:', error);
    return NextResponse.json({ error: 'Cleanup execution failed' }, { status: 500 });
  }
}
