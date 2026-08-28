import { prisma } from '@/lib/db';
import { AnalyticsEventInput, IngestionResult } from './types';
import {
  sanitizePath,
  extractCanonicalPath,
  sanitizeString,
  sanitizeEventMetadata,
} from './sanitizer';
import { isBotOrCrawler, detectDeviceType, detectBrowser, detectOs } from './botDetector';
import { resolveCountryFromHeaders, resolveTrafficSource } from './geoResolver';
import crypto from 'crypto';

const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export async function processAnalyticsEvent(
  input: AnalyticsEventInput,
  headers: Headers
): Promise<IngestionResult> {
  const userAgent = headers.get('user-agent') || undefined;

  // 1. Bot & Crawler Filtering
  if (isBotOrCrawler(userAgent)) {
    return { success: false, error: 'Filtered automated bot traffic' };
  }

  const now = new Date();
  const rawPath = sanitizePath(input.path);
  const canonicalPath = input.canonicalPath
    ? sanitizePath(input.canonicalPath)
    : extractCanonicalPath(rawPath);
  const sanitizedLocale = sanitizeString(input.locale, 5)?.toLowerCase();

  const metadata = sanitizeEventMetadata(input.eventType, input.metadata);

  // 2. Geolocation & Device Resolution (without storing IP)
  const geo = resolveCountryFromHeaders(headers);
  const deviceType = input.deviceType || detectDeviceType(userAgent);
  const browser = detectBrowser(userAgent);
  const os = detectOs(userAgent);

  const trafficSource = resolveTrafficSource(input.referrer, input.utmSource);
  const referrerDomain = sanitizeString(input.referrer, 256);
  const utmSource = sanitizeString(input.utmSource, 100);
  const utmMedium = sanitizeString(input.utmMedium, 100);
  const utmCampaign = sanitizeString(input.utmCampaign, 100);
  const utmTerm = sanitizeString(input.utmTerm, 100);
  const utmContent = sanitizeString(input.utmContent, 100);

  // 3. Visitor Resolution
  const anonymousId =
    sanitizeString(input.anonymousVisitorId, 64) || `v_${crypto.randomUUID()}`;

  let visitor = await prisma.visitor.findUnique({
    where: { anonymousId },
  });

  const isNewVisitor = !visitor;

  if (!visitor) {
    visitor = await prisma.visitor.create({
      data: {
        anonymousId,
        firstSeenAt: now,
        lastSeenAt: now,
        countryCode: geo.countryCode,
        locale: sanitizedLocale,
        totalVisits: 1,
        quoteSubmitted: input.eventType === 'QUOTE_REQUEST_SUBMITTED',
      },
    });
  } else {
    visitor = await prisma.visitor.update({
      where: { id: visitor.id },
      data: {
        lastSeenAt: now,
        countryCode: geo.countryCode || visitor.countryCode,
        locale: sanitizedLocale || visitor.locale,
        quoteSubmitted:
          visitor.quoteSubmitted || input.eventType === 'QUOTE_REQUEST_SUBMITTED',
      },
    });
  }

  // 4. Session Resolution (Enforcing 30-Minute Inactivity Threshold)
  let sessionToken = sanitizeString(input.sessionToken, 64);
  let session = sessionToken
    ? await prisma.visitorSession.findUnique({
        where: { sessionToken },
      })
    : null;

  let isNewSession = false;

  if (session) {
    const inactiveDuration = now.getTime() - session.lastActivityAt.getTime();
    if (inactiveDuration > SESSION_INACTIVITY_TIMEOUT_MS) {
      // Close expired session
      await prisma.visitorSession.update({
        where: { id: session.id },
        data: { endedAt: session.lastActivityAt },
      });
      session = null;
    }
  }

  if (!session) {
    isNewSession = true;
    sessionToken = `s_${crypto.randomUUID()}`;

    session = await prisma.visitorSession.create({
      data: {
        visitorId: visitor.id,
        sessionToken,
        startedAt: now,
        lastActivityAt: now,
        durationSeconds: 0,
        pageViewsCount: input.eventType === 'PAGE_VIEW' ? 1 : 0,
        entryPath: rawPath,
        exitPath: rawPath,
        countryCode: geo.countryCode,
        countryName: geo.countryName,
        locale: sanitizedLocale,
        trafficSource,
        referrerDomain,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        deviceType,
        browser,
        os,
        isBounce: true,
      },
    });

    if (!isNewVisitor) {
      await prisma.visitor.update({
        where: { id: visitor.id },
        data: { totalVisits: { increment: 1 } },
      });
    }
  } else {
    // Update existing active session
    const durationSeconds = Math.max(
      0,
      Math.floor((now.getTime() - session.startedAt.getTime()) / 1000)
    );
    const isPageView = input.eventType === 'PAGE_VIEW';
    const newPageViewCount = session.pageViewsCount + (isPageView ? 1 : 0);
    const isBounce = newPageViewCount <= 1 && input.eventType === 'PAGE_VIEW';

    session = await prisma.visitorSession.update({
      where: { id: session.id },
      data: {
        lastActivityAt: now,
        durationSeconds,
        pageViewsCount: isPageView ? { increment: 1 } : undefined,
        exitPath: rawPath,
        isBounce,
      },
    });
  }

  // 5. Create Analytics Event
  const createdEvent = await prisma.analyticsEvent.create({
    data: {
      visitorId: visitor.id,
      sessionId: session.id,
      eventType: input.eventType,
      path: rawPath,
      canonicalPath,
      locale: sanitizedLocale,
      countryCode: geo.countryCode,
      metadata: metadata || undefined,
      createdAt: now,
    },
  });

  return {
    success: true,
    visitorId: visitor.id,
    sessionId: session.id,
    eventId: createdEvent.id,
  };
}
