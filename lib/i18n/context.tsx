'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { Locale, DEFAULT_LOCALE, isValidLocale } from './config';
import { Dictionary } from './types';
import { getDictionary, formatTranslation } from './getDictionary';
import { usePathname, useRouter } from 'next/navigation';

interface I18nContextValue {
  locale: Locale;
  dictionary: Dictionary;
  t: (path: string, vars?: Record<string, string | number>) => string;
  changeLocale: (newLocale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  initialLocale: Locale;
  children: React.ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ initialLocale, children }) => {
  const [locale, setLocale] = useState<Locale>(
    isValidLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE
  );
  const router = useRouter();
  const pathname = usePathname();

  const dictionary = useMemo(() => getDictionary(locale), [locale]);

  const t = useMemo(() => {
    return (path: string, vars?: Record<string, string | number>) =>
      formatTranslation(dictionary, path, vars);
  }, [dictionary]);

  const changeLocale = (newLocale: Locale) => {
    if (!isValidLocale(newLocale)) return;

    // Set cookie for persistence
    document.cookie = `NEXT_LOCALE=${newLocale}; Path=/; Max-Age=${365 * 24 * 60 * 60}; SameSite=Lax`;
    setLocale(newLocale);

    // Update URL if path has locale prefix
    if (pathname) {
      const segments = pathname.split('/');
      if (segments.length > 1 && isValidLocale(segments[1])) {
        segments[1] = newLocale;
        router.push(segments.join('/'));
      }
    }
  };

  return (
    <I18nContext.Provider value={{ locale, dictionary, t, changeLocale }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    const dict = getDictionary(DEFAULT_LOCALE);
    return {
      locale: DEFAULT_LOCALE,
      dictionary: dict,
      t: (path: string, vars?: Record<string, string | number>) =>
        formatTranslation(dict, path, vars),
      changeLocale: () => {},
    };
  }
  return context;
}
