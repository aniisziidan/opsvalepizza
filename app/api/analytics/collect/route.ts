import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processAnalyticsEvent } from '@/lib/analytics/ingestion';
import { checkRateLimit, getClientIp, createRateLimitResponse } from '@/lib/ratelimit/rateLimiter';
import { AnalyticsEventType, DeviceType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const eventSchema = z.object({
  anonymousVisitorId: z.string().max(64).optional(),
  sessionToken: z.string().max(64).optional(),
  eventType: z.nativeEnum(AnalyticsEventType),
  path: z.string().max(256),
  canonicalPath: z.string().max(256).optional(),
  locale: z.string().max(10).optional(),
  referrer: z.string().max(256).optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  utmTerm: z.string().max(100).optional(),
  utmContent: z.string().max(100).optional(),
  deviceType: z.nativeEnum(DeviceType).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(req: NextRequest) {
  // 1. Rate Limiting (60 requests per minute per transient IP hash)
  const clientIp = getClientIp(req);
  const rateLimitKey = `analytics:${clientIp}`;
  const rateLimitResult = checkRateLimit(rateLimitKey, { maxRequests: 60, windowSeconds: 60 });

  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    // 2. Body Parsing & Size Limits (16KB max)
    const rawBody = await req.json();
    const parsed = eventSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid event payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await processAnalyticsEvent(parsed.data, req.headers);

    return NextResponse.json(result, {
      status: result.success ? 200 : 202,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to process analytics event' },
      { status: 500 }
    );
  }
}
