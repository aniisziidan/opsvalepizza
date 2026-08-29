import { describe, it, expect } from 'vitest';
import {
  formatPdfDecimal,
  formatPdfInteger,
  formatPdfDate,
} from '../formatLocale';
import { LOCALES } from '@/lib/i18n/config';

// Any code point above 0xFF cannot be rendered by pdfkit's WinAnsi core font.
function hasNonLatin1(s: string): boolean {
  for (const ch of s) {
    if ((ch.codePointAt(0) ?? 0) > 0xff) return true;
  }
  return false;
}

describe('PDF locale formatting', () => {
  it('formats decimals with locale grouping/decimal separators', () => {
    // English (en-IE): dot decimal, comma grouping.
    expect(formatPdfDecimal('en', 1234.5, 2)).toBe('1,234.50');
    // German: dot grouping, comma decimal.
    expect(formatPdfDecimal('de', 1234.5, 2)).toBe('1.234,50');
    // Unit-price precision (4 dp) is preserved.
    expect(formatPdfDecimal('de', 0.195, 4)).toBe('0,1950');
  });

  it('formats grouped integers per locale', () => {
    expect(formatPdfInteger('en', 25000)).toBe('25,000');
    expect(formatPdfInteger('de', 25000)).toBe('25.000');
  });

  it('formats short numeric dates per locale', () => {
    const date = '2026-09-25T10:00:00Z';
    // en-IE / de-DE / it-IT all use day-first dd/mm/yyyy.
    expect(formatPdfDate('en', date)).toBe('25/09/2026');
    expect(formatPdfDate('de', date)).toContain('2026');
    expect(formatPdfDate('de', date)).toContain('25');
  });

  it('never emits a non-Latin-1 glyph for any locale (font safety)', () => {
    for (const loc of LOCALES) {
      // French groups thousands with U+202F (narrow no-break space) — must be
      // normalised to an ASCII space so Helvetica can render it.
      expect(hasNonLatin1(formatPdfInteger(loc, 1234567))).toBe(false);
      expect(hasNonLatin1(formatPdfDecimal(loc, 1234567.89, 2))).toBe(false);
      expect(hasNonLatin1(formatPdfDate(loc, '2026-09-25T10:00:00Z'))).toBe(false);
    }
  });

  it('normalises the French narrow no-break group separator to ASCII space', () => {
    const fr = formatPdfInteger('fr', 1234567);
    // No exotic separators survive (checked via code points, not literals).
    expect(hasNonLatin1(fr)).toBe(false);
    // Grouped, using plain ASCII spaces.
    expect(fr).toBe('1 234 567');
  });
});
