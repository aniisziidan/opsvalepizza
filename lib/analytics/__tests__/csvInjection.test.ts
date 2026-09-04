import { describe, it, expect } from 'vitest';
import { csvCell, formatAnalyticsAsCsv } from '../export';
import type { VisitorIntelligenceData } from '../types';

describe('csvCell formula-injection neutralization', () => {
  it('prefixes formula-triggering cells with a single quote', () => {
    expect(csvCell('=SUM(A1:A2)')).toBe(`"'=SUM(A1:A2)"`);
    expect(csvCell('+1')).toBe(`"'+1"`);
    expect(csvCell('-1')).toBe(`"'-1"`);
    expect(csvCell('@cmd')).toBe(`"'@cmd"`);
  });

  it('neutralizes the classic command-execution payload', () => {
    const payload = `=cmd|'/C calc'!A1`;
    const out = csvCell(payload);
    expect(out.startsWith(`"'=`)).toBe(true);
  });

  it('escapes embedded double quotes per RFC 4180', () => {
    expect(csvCell('say "hi"')).toBe(`"say ""hi"""`);
  });

  it('leaves benign values quoted but unmodified', () => {
    expect(csvCell('Germany')).toBe('"Germany"');
    expect(csvCell('/en/calculator')).toBe('"/en/calculator"');
  });

  it('handles null/undefined as empty cells', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it('neutralizes an attacker-controlled utm medium in the campaigns export', () => {
    const data = {
      campaigns: [
        {
          source: 'REFERRAL',
          medium: '=HYPERLINK("https://evil.example")',
          campaign: 'spring',
          sessions: 3,
          uniqueVisitors: 2,
          calculatorUses: 1,
          quoteSubmissions: 0,
          conversionRatePct: 0,
        },
      ],
    } as unknown as VisitorIntelligenceData;

    const csv = formatAnalyticsAsCsv(data, 'campaigns');
    // The dangerous cell must be text-escaped, never a live formula.
    expect(csv).toContain(`"'=HYPERLINK(""https://evil.example"")"`);
    expect(csv).not.toContain(',=HYPERLINK');
  });
});
