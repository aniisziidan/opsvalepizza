import { Locale } from '@/lib/i18n/config';

/**
 * Locale-aware, Latin-1-safe formatting for the proposal PDF.
 *
 * The PDF is drawn with pdfkit's built-in Helvetica core font, which only
 * supports the WinAnsi (~Latin-1) glyph set. `Intl.NumberFormat` inserts
 * narrow/thin no-break spaces (U+202F, U+2009, U+2007) as group separators for
 * some locales (notably fr) -- those code points are NOT in WinAnsi and render
 * as a missing glyph. Every formatter below therefore normalises exotic spaces
 * to a plain ASCII space so the output is always renderable and deterministic.
 *
 * All amounts are EUR regardless of locale (per spec), so English maps to en-IE
 * (English written conventions with euro grouping/decimals) rather than en-GB.
 */
const PDF_LOCALE_TAG: Record<Locale, string> = {
  en: 'en-IE',
  de: 'de-DE',
  fr: 'fr-FR',
  it: 'it-IT',
  es: 'es-ES',
};

// Exotic space separators pdfkit's WinAnsi core font cannot render:
// U+00A0 no-break, U+202F narrow no-break, U+2007 figure, U+2009 thin space.
const EXOTIC_SPACE_CODES = new Set([0xa0, 0x202f, 0x2007, 0x2009]);

/** Normalise exotic space separators to a plain ASCII space. */
function toLatin1SafeSpaces(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0);
    out += code !== undefined && EXOTIC_SPACE_CODES.has(code) ? ' ' : ch;
  }
  return out;
}

/** Fixed-fraction decimal (e.g. unit price 0,1950 in de; 0.1950 in en). */
export function formatPdfDecimal(
  locale: Locale,
  value: number,
  fractionDigits: number,
): string {
  return toLatin1SafeSpaces(
    new Intl.NumberFormat(PDF_LOCALE_TAG[locale], {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value),
  );
}

/** Grouped integer (e.g. quantities: 25.000 in de, 25,000 in en). */
export function formatPdfInteger(locale: Locale, value: number): string {
  return toLatin1SafeSpaces(
    new Intl.NumberFormat(PDF_LOCALE_TAG[locale]).format(value),
  );
}

/** Short numeric date (dd/mm/yyyy family), locale-ordered. */
export function formatPdfDate(locale: Locale, date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return toLatin1SafeSpaces(
    new Intl.DateTimeFormat(PDF_LOCALE_TAG[locale], {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d),
  );
}
