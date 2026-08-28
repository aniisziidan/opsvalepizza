import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsEventType, TrafficSourceType, DeviceType } from '@prisma/client';

describe('Analytics Ingestion & Session Lifecycle Engine', () => {
  interface MockVisitor {
    id: string;
    anonymousId: string;
    firstSeenAt: Date;
    lastSeenAt: Date;
    countryCode?: string;
    totalVisits: number;
    quoteSubmitted: boolean;
  }

  interface MockSession {
    id: string;
    visitorId: string;
    sessionToken: string;
    startedAt: Date;
    endedAt?: Date | null;
    lastActivityAt: Date;
    durationSeconds: number;
    pageViewsCount: number;
    entryPath: string;
    exitPath?: string;
    isBounce: boolean;
    countryCode?: string;
    trafficSource: TrafficSourceType;
    deviceType: DeviceType;
  }

  interface MockEvent {
    id: string;
    visitorId: string;
    sessionId: string;
    eventType: AnalyticsEventType;
    path: string;
    canonicalPath: string;
    createdAt: Date;
  }

  class MockIngestionEngine {
    visitors: MockVisitor[] = [];
    sessions: MockSession[] = [];
    events: MockEvent[] = [];

    sessionTimeoutMs = 30 * 60 * 1000; // 30 mins

    async ingest(
      input: {
        anonymousVisitorId: string;
        sessionToken: string;
        eventType: AnalyticsEventType;
        path: string;
        canonicalPath?: string;
      },
      now: Date = new Date()
    ) {
      // 1. Visitor
      let visitor = this.visitors.find((v) => v.anonymousId === input.anonymousVisitorId);
      if (!visitor) {
        visitor = {
          id: `vis-${Date.now()}-${Math.random()}`,
          anonymousId: input.anonymousVisitorId,
          firstSeenAt: now,
          lastSeenAt: now,
          totalVisits: 1,
          quoteSubmitted: input.eventType === 'QUOTE_REQUEST_SUBMITTED',
        };
        this.visitors.push(visitor);
      } else {
        visitor.lastSeenAt = now;
        if (input.eventType === 'QUOTE_REQUEST_SUBMITTED') visitor.quoteSubmitted = true;
      }

      // 2. Session
      let session = this.sessions.find((s) => s.sessionToken === input.sessionToken);

      if (session) {
        const inactiveMs = now.getTime() - session.lastActivityAt.getTime();
        if (inactiveMs > this.sessionTimeoutMs) {
          session.endedAt = session.lastActivityAt;
          session = undefined; // Expired session -> force new session
        }
      }

      if (!session) {
        const sessionToken = input.sessionToken;
        session = {
          id: `sess-${Date.now()}-${Math.random()}`,
          visitorId: visitor.id,
          sessionToken,
          startedAt: now,
          lastActivityAt: now,
          durationSeconds: 0,
          pageViewsCount: input.eventType === 'PAGE_VIEW' ? 1 : 0,
          entryPath: input.path,
          exitPath: input.path,
          isBounce: true,
          trafficSource: 'DIRECT',
          deviceType: 'DESKTOP',
        };
        this.sessions.push(session);
      } else {
        const durationSec = Math.max(0, Math.floor((now.getTime() - session.startedAt.getTime()) / 1000));
        const isPageView = input.eventType === 'PAGE_VIEW';
        session.lastActivityAt = now;
        session.durationSeconds = durationSec;
        if (isPageView) session.pageViewsCount += 1;
        session.exitPath = input.path;
        session.isBounce = session.pageViewsCount <= 1 && isPageView;
      }

      // 3. Event
      const ev: MockEvent = {
        id: `ev-${Date.now()}-${Math.random()}`,
        visitorId: visitor.id,
        sessionId: session.id,
        eventType: input.eventType,
        path: input.path,
        canonicalPath: input.canonicalPath || input.path,
        createdAt: now,
      };
      this.events.push(ev);

      return { visitorId: visitor.id, sessionId: session.id, eventId: ev.id };
    }
  }

  let engine: MockIngestionEngine;

  beforeEach(() => {
    engine = new MockIngestionEngine();
  });

  it('creates visitor and initial session on first page view', async () => {
    const res = await engine.ingest({
      anonymousVisitorId: 'vid-123',
      sessionToken: 'sid-123',
      eventType: 'PAGE_VIEW',
      path: '/en/calculator',
      canonicalPath: '/calculator',
    });

    expect(res.visitorId).toBeDefined();
    expect(res.sessionId).toBeDefined();
    expect(engine.visitors.length).toBe(1);
    expect(engine.sessions.length).toBe(1);
    expect(engine.sessions[0].isBounce).toBe(true);
    expect(engine.sessions[0].pageViewsCount).toBe(1);
  });

  it('updates session duration and removes bounce status on subsequent page views', async () => {
    const t0 = new Date('2026-08-28T12:00:00Z');
    await engine.ingest(
      {
        anonymousVisitorId: 'vid-123',
        sessionToken: 'sid-123',
        eventType: 'PAGE_VIEW',
        path: '/en',
        canonicalPath: '/',
      },
      t0
    );

    // 45 seconds later
    const t1 = new Date('2026-08-28T12:00:45Z');
    await engine.ingest(
      {
        anonymousVisitorId: 'vid-123',
        sessionToken: 'sid-123',
        eventType: 'PAGE_VIEW',
        path: '/en/calculator',
        canonicalPath: '/calculator',
      },
      t1
    );

    expect(engine.sessions[0].durationSeconds).toBe(45);
    expect(engine.sessions[0].pageViewsCount).toBe(2);
    expect(engine.sessions[0].isBounce).toBe(false);
    expect(engine.sessions[0].exitPath).toBe('/en/calculator');
  });

  it('creates a new session when inactivity exceeds 30 minutes', async () => {
    const t0 = new Date('2026-08-28T12:00:00Z');
    await engine.ingest(
      {
        anonymousVisitorId: 'vid-123',
        sessionToken: 'sid-123',
        eventType: 'PAGE_VIEW',
        path: '/en',
      },
      t0
    );

    // 35 minutes later (exceeds 30m timeout)
    const t1 = new Date('2026-08-28T12:35:00Z');
    await engine.ingest(
      {
        anonymousVisitorId: 'vid-123',
        sessionToken: 'sid-123',
        eventType: 'PAGE_VIEW',
        path: '/en/quote',
      },
      t1
    );

    expect(engine.sessions.length).toBe(2);
    expect(engine.sessions[0].endedAt).toEqual(t0);
    expect(engine.sessions[1].entryPath).toBe('/en/quote');
  });
});
