import { describe, it, expect } from 'vitest';
import { resolveMarkup, type MarkupRule } from '../resolveMarkup';
const rules: MarkupRule[] = [
  { scope: 'GLOBAL', countryId: null, boxConfigId: null, markupMin: 0.25, markupMax: 0.25, active: true },
  { scope: 'COUNTRY', countryId: 'de', boxConfigId: null, markupMin: 0.30, markupMax: 0.30, active: true },
  { scope: 'PRODUCT', countryId: 'de', boxConfigId: 'box12wp', markupMin: 0.35, markupMax: 0.35, active: true },
];
describe('resolveMarkup', () => {
  it('picks the product-specific rule when country+box match (spec §29 example ⇒ 35%)', () => {
    const r = resolveMarkup(rules, { countryId: 'de', boxConfigId: 'box12wp' });
    expect(r.markupMin).toBeCloseTo(0.35); expect(r.source).toBe('PRODUCT');
  });
  it('falls back to country rule when no product rule matches', () => {
    const r = resolveMarkup(rules, { countryId: 'de', boxConfigId: 'other' });
    expect(r.markupMin).toBeCloseTo(0.30); expect(r.source).toBe('COUNTRY');
  });
  it('falls back to global when no country rule matches', () => {
    const r = resolveMarkup(rules, { countryId: 'fr', boxConfigId: 'other' });
    expect(r.markupMin).toBeCloseTo(0.25); expect(r.source).toBe('GLOBAL');
  });
  it('clamps markup into [0.15, 0.45]', () => {
    const wild: MarkupRule[] = [{ scope: 'GLOBAL', countryId: null, boxConfigId: null, markupMin: 0.05, markupMax: 0.90, active: true }];
    const r = resolveMarkup(wild, { countryId: 'x', boxConfigId: 'y' });
    expect(r.markupMin).toBeCloseTo(0.15); expect(r.markupMax).toBeCloseTo(0.45);
  });
  it('ignores inactive rules', () => {
    const r = resolveMarkup(
      [{ scope: 'GLOBAL', countryId: null, boxConfigId: null, markupMin: 0.25, markupMax: 0.25, active: true },
       { scope: 'PRODUCT', countryId: 'de', boxConfigId: 'box12wp', markupMin: 0.35, markupMax: 0.35, active: false }],
      { countryId: 'de', boxConfigId: 'box12wp' });
    expect(r.source).toBe('GLOBAL');
  });
  it('throws when no rule matches at all', () => {
    expect(() => resolveMarkup([], { countryId: 'x', boxConfigId: 'y' })).toThrow();
  });
});
