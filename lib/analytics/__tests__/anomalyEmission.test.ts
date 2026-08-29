import { describe, it, expect } from 'vitest';
import { mapHealthAlertsToNotificationEvents } from '../anomalyEmission';
import type { WebsiteHealthAlert } from '../types';

const baseAlert = (overrides: Partial<WebsiteHealthAlert>): WebsiteHealthAlert => ({
  id: 'alert-1',
  type: 'INFO',
  title: 'Title',
  description: 'Description',
  detectedAt: new Date().toISOString(),
  ...overrides,
});

describe('mapHealthAlertsToNotificationEvents', () => {
  it('skips purely informational alerts (nothing to push to admins)', () => {
    const events = mapHealthAlertsToNotificationEvents([
      baseAlert({ id: 'top-territory', type: 'INFO' }),
    ]);
    expect(events).toHaveLength(0);
  });

  it('maps an OPPORTUNITY alert to a NORMAL-priority traffic opportunity event', () => {
    const [event] = mapHealthAlertsToNotificationEvents([
      baseAlert({
        id: 'traffic-surge',
        type: 'OPPORTUNITY',
        metric: 'Unique Visitors',
        changePct: 42,
      }),
    ]);
    expect(event.type).toBe('ANALYTICS_TRAFFIC_OPPORTUNITY');
    expect(event.category).toBe('ANALYTICS');
    expect(event.priority).toBe('NORMAL');
  });

  it('maps a WARNING alert to a HIGH-priority traffic anomaly event', () => {
    const [event] = mapHealthAlertsToNotificationEvents([
      baseAlert({
        id: 'traffic-drop',
        type: 'WARNING',
        metric: 'Unique Visitors',
        changePct: -37,
      }),
    ]);
    expect(event.type).toBe('ANALYTICS_TRAFFIC_ANOMALY');
    expect(event.priority).toBe('HIGH');
  });

  it('maps an ANOMALY alert (high exit drop-off) to a HIGH-priority conversion drop event', () => {
    const [event] = mapHealthAlertsToNotificationEvents([
      baseAlert({ id: 'exit-/en/quote', type: 'ANOMALY' }),
    ]);
    expect(event.type).toBe('ANALYTICS_CONVERSION_DROP');
    expect(event.priority).toBe('HIGH');
  });

  it('derives a stable incidentKey from the alert id so the dispatcher can dedupe', () => {
    const [event] = mapHealthAlertsToNotificationEvents([
      baseAlert({ id: 'traffic-drop', type: 'WARNING' }),
    ]);
    expect(event.incidentKey).toBe('analytics:traffic-drop');
  });

  it('carries the alert copy, metric metadata, and an admin action link', () => {
    const [event] = mapHealthAlertsToNotificationEvents([
      baseAlert({
        id: 'traffic-drop',
        type: 'WARNING',
        title: 'Traffic Decline Warning: -37%',
        description: 'Visitor volume declined.',
        metric: 'Unique Visitors',
        changePct: -37,
      }),
    ]);
    expect(event.title).toBe('Traffic Decline Warning: -37%');
    expect(event.message).toBe('Visitor volume declined.');
    expect(event.actionUrl).toBe('/admin/visitors');
    expect(event.metadata).toMatchObject({ metric: 'Unique Visitors', changePct: -37 });
  });

  it('emits one event per non-informational alert and preserves order', () => {
    const events = mapHealthAlertsToNotificationEvents([
      baseAlert({ id: 'traffic-surge', type: 'OPPORTUNITY' }),
      baseAlert({ id: 'top-territory', type: 'INFO' }),
      baseAlert({ id: 'exit-/en/quote', type: 'ANOMALY' }),
    ]);
    expect(events.map((e) => e.type)).toEqual([
      'ANALYTICS_TRAFFIC_OPPORTUNITY',
      'ANALYTICS_CONVERSION_DROP',
    ]);
  });
});
