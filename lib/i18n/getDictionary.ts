import { Locale, DEFAULT_LOCALE, isValidLocale } from './config';
import { Dictionary } from './types';
import { en } from './dictionaries/en';
import { de } from './dictionaries/de';
import { fr } from './dictionaries/fr';
import { it } from './dictionaries/it';
import { es } from './dictionaries/es';

const dictionaries: Record<Locale, Dictionary> = {
  en,
  de,
  fr,
  it,
  es,
};

export function getDictionary(locale: string | null | undefined): Dictionary {
  if (locale && isValidLocale(locale)) {
    return dictionaries[locale];
  }
  return dictionaries[DEFAULT_LOCALE];
}

/**
 * Resolves a nested dictionary string by key path (e.g. 'calculator.annualSavingsTitle')
 * and replaces template variables e.g. {{amount}}.
 */
export function formatTranslation(
  dict: Dictionary,
  path: string,
  vars?: Record<string, string | number>
): string {
  const keys = path.split('.');
  let current: any = dict;

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      // Fallback to English if missing in target
      let fallback: any = en;
      for (const fbKey of keys) {
        if (fallback && typeof fallback === 'object' && fbKey in fallback) {
          fallback = fallback[fbKey];
        } else {
          return path;
        }
      }
      current = fallback;
      break;
    }
  }

  if (typeof current !== 'string') return path;

  if (vars) {
    let result = current;
    for (const [vKey, vVal] of Object.entries(vars)) {
      result = result.replaceAll(`{{${vKey}}}`, String(vVal));
    }
    return result;
  }

  return current;
}
