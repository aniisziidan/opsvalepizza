'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';

export const Footer: React.FC = () => {
  const { t, locale } = useTranslation();

  const handleOpenCookieSettings = () => {
    window.dispatchEvent(new CustomEvent('opsvale_open_cookie_preferences'));
  };

  return (
    <footer className="w-full bg-[#041632] text-white border-t border-[#c5c6ce] relative z-10 font-mono-data text-xs">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-[#1b2b48]">
          {/* Brand Col */}
          <div className="md:col-span-6 lg:col-span-5">
            <Link
              href={`/${locale}`}
              className="font-headline text-2xl font-bold text-white flex items-center gap-2 mb-4 hover:opacity-90 transition-opacity cursor-pointer text-left w-fit"
            >
              <span className="material-symbols-outlined text-2xl text-[#e77114]">package</span>
              {t('common.brandName')}
            </Link>
            <p className="font-body text-sm text-[#8393b5] max-w-sm leading-relaxed mb-6">
              {t('common.tagline')}
            </p>
            <div className="flex items-center gap-2 text-xs text-[#8393b5]">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>14 European Logistics Hubs Operational</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 lg:col-span-3">
            <span className="text-xs text-[#e3c290] uppercase tracking-widest block mb-4 font-semibold">
              Platform &amp; Services
            </span>
            <ul className="space-y-3 text-xs text-[#8393b5]">
              <li>
                <Link href={`/${locale}/products`} className="hover:text-white transition-colors cursor-pointer py-1 inline-block min-h-[32px]">
                  {t('nav.products')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/how-it-works`} className="hover:text-white transition-colors cursor-pointer py-1 inline-block min-h-[32px]">
                  {t('nav.howItWorks')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/calculator`} className="hover:text-white transition-colors cursor-pointer py-1 inline-block min-h-[32px]">
                  {t('nav.calculator')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/about`} className="hover:text-white transition-colors cursor-pointer py-1 inline-block min-h-[32px]">
                  {t('nav.about')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance Desk */}
          <div className="md:col-span-3 lg:col-span-4">
            <span className="text-xs text-[#e3c290] uppercase tracking-widest block mb-4 font-semibold">
              Legal &amp; Compliance Desk
            </span>
            <ul className="space-y-3 text-xs text-[#8393b5] mb-6">
              <li>
                <Link href={`/${locale}/imprint`} className="hover:text-white transition-colors cursor-pointer py-1 inline-block min-h-[32px]">
                  {t('legal.imprintTitle')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/privacy`} className="hover:text-white transition-colors cursor-pointer py-1 inline-block min-h-[32px]">
                  {t('legal.privacyTitle')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/terms`} className="hover:text-white transition-colors cursor-pointer py-1 inline-block min-h-[32px]">
                  {t('legal.termsTitle')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/cookies`} className="hover:text-white transition-colors cursor-pointer py-1 inline-block min-h-[32px]">
                  {t('legal.cookiesTitle')}
                </Link>
              </li>
            </ul>

            {/* Industrial Barcode representation */}
            <div className="bg-[#1b2b48] border border-[#4f5e7e] p-3 rounded flex items-center justify-between text-[10px] text-[#8393b5] max-w-xs">
              <span className="tracking-[4px] text-white font-bold">||||||||||||||||||||</span>
              <span className="text-[#e3c290]">OPS-VALE-EUR-01</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#8393b5]">
          <p>© 2026 {t('common.brandName')}. {t('common.allRightsReserved')}</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link href={`/${locale}/imprint`} className="hover:text-white transition-colors py-1">
              {t('legal.imprintTitle')}
            </Link>
            <Link href={`/${locale}/privacy`} className="hover:text-white transition-colors py-1">
              {t('legal.privacyTitle')}
            </Link>
            <Link href={`/${locale}/terms`} className="hover:text-white transition-colors py-1">
              {t('legal.termsTitle')}
            </Link>
            <button
              type="button"
              onClick={handleOpenCookieSettings}
              className="text-[#e3c290] hover:underline cursor-pointer flex items-center gap-1 py-1 min-h-[36px]"
            >
              <span className="material-symbols-outlined text-[14px]">tune</span>
              <span>{t('consent.customize')}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
