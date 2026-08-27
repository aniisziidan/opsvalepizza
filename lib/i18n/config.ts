export const LOCALES = ['en', 'de', 'fr', 'it', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_METADATA: Record<
  Locale,
  { name: string; nativeName: string; flag: string; countryCode: string }
> = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧', countryCode: 'GB' },
  de: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', countryCode: 'DE' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷', countryCode: 'FR' },
  it: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', countryCode: 'IT' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', countryCode: 'ES' },
};

export function isValidLocale(str: string): str is Locale {
  return LOCALES.includes(str as Locale);
}
