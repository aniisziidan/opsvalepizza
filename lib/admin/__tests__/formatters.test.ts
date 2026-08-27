import { describe, it, expect } from 'vitest';
import {
  timeAgo,
  formatCurrency,
  formatNumber,
  formatBoxSpec,
  formatDateTime,
} from '../formatters';

describe('Admin Formatters', () => {
  describe('formatCurrency', () => {
    it('formats numbers into EUR currency strings', () => {
      expect(formatCurrency(0.18)).toBe('€0.18');
      expect(formatCurrency(12400)).toBe('€12,400.00');
    });

    it('formats string numbers correctly', () => {
      expect(formatCurrency('0.2500')).toBe('€0.25');
      expect(formatCurrency('15890.50')).toBe('€15,890.50');
    });

    it('handles null and undefined gracefully', () => {
      expect(formatCurrency(null)).toBe('—');
      expect(formatCurrency(undefined)).toBe('—');
      expect(formatCurrency('')).toBe('—');
    });
  });

  describe('formatNumber', () => {
    it('formats integers with thousands separators', () => {
      expect(formatNumber(150000)).toBe('150,000');
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(null)).toBe('0');
    });
  });

  describe('formatBoxSpec', () => {
    it('formats standard quote request specifications', () => {
      const spec = formatBoxSpec(
        {
          boxSpecificationType: 'STANDARD',
          standardBoxSize: '32cm',
          lengthMm: 320,
          widthMm: 320,
          heightMm: 40,
          material: 'KRAFT',
          print: 'PRINTED',
        },
        null
      );
      expect(spec).toBe('32cm Standard (320×320×40mm) • KRAFT • Custom Printed');
    });

    it('formats custom quote request specifications', () => {
      const spec = formatBoxSpec(
        {
          boxSpecificationType: 'CUSTOM',
          standardBoxSize: null,
          lengthMm: 350,
          widthMm: 350,
          heightMm: 45,
          material: 'WHITE',
          print: 'PLAIN',
        },
        null
      );
      expect(spec).toBe('350×350×45mm (Custom) • WHITE • Plain');
    });

    it('falls back to calculator snapshot when quote request is absent', () => {
      const spec = formatBoxSpec(null, {
        boxSize: '28cm',
        material: 'KRAFT',
        print: 'PLAIN',
      });
      expect(spec).toBe('28cm • KRAFT • Plain');
    });
  });

  describe('timeAgo', () => {
    it('returns "Just now" for dates within 60 seconds', () => {
      const now = new Date();
      expect(timeAgo(now)).toBe('Just now');
    });

    it('handles null/undefined', () => {
      expect(timeAgo(null)).toBe('—');
    });
  });
});
