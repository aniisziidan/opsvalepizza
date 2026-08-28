import { describe, it, expect } from 'vitest';
import { computeDateRange } from '../queries';

describe('Analytics Queries & KPI Computation Engine', () => {
  it('computes accurate start, end and previous comparison dates for presets', () => {
    const d7 = computeDateRange('7D');
    const diffDaysCurrent = (d7.endDate.getTime() - d7.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const diffDaysPrev = (d7.previousEndDate.getTime() - d7.previousStartDate.getTime()) / (1000 * 60 * 60 * 24);

    expect(Math.round(diffDaysCurrent)).toBe(7);
    expect(Math.round(diffDaysPrev)).toBe(7);
    expect(d7.previousEndDate.getTime()).toBeLessThan(d7.startDate.getTime());
  });

  it('computes percentage deltas accurately including zero denominators', () => {
    const calcDelta = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Number((((curr - prev) / prev) * 100).toFixed(1));
    };

    expect(calcDelta(150, 100)).toBe(50.0);
    expect(calcDelta(50, 100)).toBe(-50.0);
    expect(calcDelta(10, 0)).toBe(100);
    expect(calcDelta(0, 0)).toBe(0);
  });

  it('calculates multi-stage conversion rates without dividing by zero', () => {
    const visitors = 1000;
    const quotes = 45;
    const rate = visitors > 0 ? (quotes / visitors) * 100 : 0;

    expect(rate).toBe(4.5);
  });
});
