import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizePath,
  extractCanonicalPath,
  sanitizeEventMetadata,
} from '../sanitizer';

describe('Analytics Sanitizer & PII Protection', () => {
  it('sanitizes strings and enforces maximum character lengths', () => {
    expect(sanitizeString('   valid string   ', 10)).toBe('valid stri');
    expect(sanitizeString('', 50)).toBeUndefined();
    expect(sanitizeString(null)).toBeUndefined();
  });

  it('normalizes paths and strips protocol/host', () => {
    expect(sanitizePath('https://opsvale.eu/en/calculator')).toBe('/en/calculator');
    expect(sanitizePath('calculator/')).toBe('/calculator/');
    expect(sanitizePath('')).toBe('/');
  });

  it('extracts canonical path by stripping locale prefixes', () => {
    expect(extractCanonicalPath('/en')).toBe('/');
    expect(extractCanonicalPath('/de/calculator')).toBe('/calculator');
    expect(extractCanonicalPath('/fr/quote')).toBe('/quote');
    expect(extractCanonicalPath('/it/products')).toBe('/products');
    expect(extractCanonicalPath('/es/how-it-works')).toBe('/how-it-works');
    expect(extractCanonicalPath('/privacy')).toBe('/privacy');
  });

  it('strictly strips forbidden PII fields from metadata', () => {
    const rawMetadata = {
      boxSize: '32cm',
      quantity: 15000,
      email: 'customer@victim.com',
      name: 'Mario Rossi',
      phone: '+39123456789',
      notes: 'Please deliver to my home address',
      password: 'secretPassword123',
    };

    const sanitized = sanitizeEventMetadata('CALCULATOR_USED', rawMetadata);

    expect(sanitized).toBeDefined();
    expect(sanitized?.boxSize).toBe('32cm');
    expect(sanitized?.email).toBeUndefined();
    expect(sanitized?.name).toBeUndefined();
    expect(sanitized?.phone).toBeUndefined();
    expect(sanitized?.notes).toBeUndefined();
    expect(sanitized?.password).toBeUndefined();
  });

  it('drops unallowed metadata fields not in event allowlist', () => {
    const rawMetadata = {
      title: 'Packaging Catalog',
      unknownField: 'test',
      untrustedPayload: { malicious: true },
    };

    const sanitized = sanitizeEventMetadata('PAGE_VIEW', rawMetadata);
    expect(sanitized).toBeDefined();
    expect(sanitized?.title).toBe('Packaging Catalog');
    expect(sanitized?.unknownField).toBeUndefined();
    expect(sanitized?.untrustedPayload).toBeUndefined();
  });
});
