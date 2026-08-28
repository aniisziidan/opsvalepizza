import React from 'react';
import type { Metadata } from 'next';
import { LOCALES, Locale, isValidLocale, DEFAULT_LOCALE, LOCALE_METADATA } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/getDictionary';
import { I18nProvider } from '@/lib/i18n/context';
import { TopNavBar } from '@/components/TopNavBar';
import { Footer } from '@/components/Footer';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);

  return {
    title: `${dict.common.brandName} — ${dict.hero.headline} ${dict.hero.headlineHighlight}`,
    description: dict.hero.subheadline,
    alternates: {
      canonical: `https://opsvale.eu/${locale}`,
      languages: {
        en: 'https://opsvale.eu/en',
        de: 'https://opsvale.eu/de',
        fr: 'https://opsvale.eu/fr',
        it: 'https://opsvale.eu/it',
        es: 'https://opsvale.eu/es',
        'x-default': 'https://opsvale.eu/en',
      },
    },
    openGraph: {
      title: `${dict.common.brandName} | ${dict.common.tagline}`,
      description: dict.hero.subheadline,
      locale: locale === 'en' ? 'en_GB' : `${locale}_${LOCALE_METADATA[locale].countryCode}`,
      type: 'website',
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return (
    <I18nProvider initialLocale={locale}>
      <div className="min-h-screen bg-[#eaeff7] flex flex-col items-center overflow-x-hidden">
        <div className="w-full max-w-[1440px] min-h-screen flex flex-col justify-between bg-[#f8f9ff] shadow-[0_0_50px_rgba(4,22,50,0.06)] border-x border-[#c5c6ce]/60 relative">
          <TopNavBar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </div>
      <CookieConsentBanner />
    </I18nProvider>
  );
}
