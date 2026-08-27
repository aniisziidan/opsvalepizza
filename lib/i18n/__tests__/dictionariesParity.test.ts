import { describe, it, expect } from 'vitest';
import { en } from '../dictionaries/en';
import { de } from '../dictionaries/de';
import { fr } from '../dictionaries/fr';
import { it as itDict } from '../dictionaries/it';
import { es } from '../dictionaries/es';
import { Dictionary } from '../types';

const targetLocales: Record<string, Dictionary> = {
  de,
  fr,
  it: itDict,
  es,
};

function getDeepKeysAndValues(obj: any, prefix = ''): Map<string, any> {
  const result = new Map<string, any>();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = getDeepKeysAndValues(value, fullKey);
      for (const [nKey, nVal] of nested) {
        result.set(nKey, nVal);
      }
    } else {
      result.set(fullKey, value);
    }
  }
  return result;
}

function extractInterpolationTokens(str: string): string[] {
  const matches = str.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g);
  if (!matches) return [];
  return matches.map((m) => m.replace(/[\{\}]/g, '')).sort();
}

describe('I18n Translation Catalogs Deep Parity Suite', () => {
  const canonicalMap = getDeepKeysAndValues(en);

  for (const [lang, dict] of Object.entries(targetLocales)) {
    describe(`Language: ${lang.toUpperCase()}`, () => {
      const targetMap = getDeepKeysAndValues(dict);

      it('contains 100% of canonical keys (no missing keys)', () => {
        const missingKeys: string[] = [];
        for (const key of canonicalMap.keys()) {
          if (!targetMap.has(key)) {
            missingKeys.push(key);
          }
        }
        expect(missingKeys, `Missing keys in ${lang}`).toEqual([]);
      });

      it('contains 0 obsolete or orphaned keys', () => {
        const obsoleteKeys: string[] = [];
        for (const key of targetMap.keys()) {
          if (!canonicalMap.has(key)) {
            obsoleteKeys.push(key);
          }
        }
        expect(obsoleteKeys, `Obsolete keys in ${lang}`).toEqual([]);
      });

      it('matches exact data types for all keys', () => {
        const typeMismatches: string[] = [];
        for (const [key, enVal] of canonicalMap.entries()) {
          const targetVal = targetMap.get(key);
          if (typeof enVal !== typeof targetVal) {
            typeMismatches.push(`${key}: expected ${typeof enVal}, got ${typeof targetVal}`);
          }
        }
        expect(typeMismatches, `Type mismatches in ${lang}`).toEqual([]);
      });

      it('preserves all interpolation tokens without corruption', () => {
        const tokenMismatches: string[] = [];
        for (const [key, enVal] of canonicalMap.entries()) {
          if (typeof enVal === 'string') {
            const enTokens = extractInterpolationTokens(enVal);
            if (enTokens.length > 0) {
              const targetVal = targetMap.get(key);
              if (typeof targetVal === 'string') {
                const targetTokens = extractInterpolationTokens(targetVal);
                if (JSON.stringify(enTokens) !== JSON.stringify(targetTokens)) {
                  tokenMismatches.push(
                    `${key}: expected tokens [${enTokens.join(', ')}], got [${targetTokens.join(', ')}]`
                  );
                }
              }
            }
          }
        }
        expect(tokenMismatches, `Interpolation token mismatches in ${lang}`).toEqual([]);
      });
    });
  }
});
